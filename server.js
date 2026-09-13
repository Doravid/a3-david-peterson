const express = require('express');
const {MongoClient, ObjectId} = require('mongodb');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;

let db;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrcAttr: ['\'unsafe-inline\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.jsdelivr.net'],
      connectSrc: ['\'self\'', 'https://cdn.jsdelivr.net']
    }
  }
}));


app.use(compression());
app.use(morgan('dev'));
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

passport.serializeUser((user, done) => {
  done(null, user.githubId);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.collection('users').findOne({githubId: id});
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


app.get(
    '/auth/github', passport.authenticate('github', {scope: ['user:email']}));

app.get(
    '/auth/github/callback',
    passport.authenticate('github', {failureRedirect: '/'}), (req, res) => {
      res.redirect('/store.html');
    });

app.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({error: 'Unauthorized'});
}

app.get('/api/keyboards', ensureAuthenticated, async (req, res) => {
  const keyboards = await db.collection('keyboards').find({}).toArray();
  res.json(keyboards);
});

app.post('/api/keyboards', ensureAuthenticated, async (req, res) => {
  const {name, size, price, switches, rgb, details} = req.body;
  const result = await db.collection('keyboards').insertOne({
    sellerId: req.user.githubId,
    sellerName: req.user.displayName || req.user.username,
    name,
    size,
    price: parseFloat(price),
    switches,
    rgb: rgb === true || rgb === 'on',
    details,
    status: 'available'
  });
  res.json(result);
});

app.put('/api/keyboards/:id', ensureAuthenticated, async (req, res) => {
  const {name, size, price, switches, rgb, details} = req.body;
  const result = await db.collection('keyboards')
                     .updateOne(
                         {
                           _id: new ObjectId(req.params.id),
                           sellerId: req.user.githubId,
                           status: 'available'
                         },
                         {
                           $set: {
                             name,
                             size,
                             price: parseFloat(price),
                             switches,
                             rgb: rgb === true || rgb === 'on',
                             details
                           }
                         });
  res.json(result);
});

app.delete('/api/keyboards/:id', ensureAuthenticated, async (req, res) => {
  const result = await db.collection('keyboards').deleteOne({
    _id: new ObjectId(req.params.id),
    sellerId: req.user.githubId
  });
  res.json(result);
});

app.post('/api/buy/:id', ensureAuthenticated, async (req, res) => {
  const result =
      await db.collection('keyboards')
          .updateOne({_id: new ObjectId(req.params.id), status: 'available'}, {
            $set: {
              status: 'sold',
              buyerId: req.user.githubId,
              buyerName: req.user.displayName || req.user.username
            }
          });
  res.json(result);
});

app.get('/api/user', ensureAuthenticated, (req, res) => {
  res.json(req.user);
});


async function startServer() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db('keyboard_store');

    passport.use(new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL ||
              'http://localhost:3000/auth/github/callback'
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const users = db.collection('users');
            let user = await users.findOne({githubId: profile.id});

            if (!user) {
              const newUser = {
                githubId: profile.id,
                username: profile.username,
                displayName: profile.displayName || profile.username
              };
              await users.insertOne(newUser);
              user = newUser;
            }
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }));

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database connection failed', err);
    process.exit(1);
  }
}

startServer();