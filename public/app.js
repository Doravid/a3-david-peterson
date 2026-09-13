const form = document.getElementById('keyboardForm');
const marketItems = document.getElementById('marketItems');
const soldItems = document.getElementById('soldItems');
const purchasedItems = document.getElementById('purchasedItems');
const cancelBtn = document.getElementById('cancelBtn');
const submitBtn = document.getElementById('submitBtn');

let currentUser = null;

async function init() {
  const userRes = await fetch('/api/user');
  if (!userRes.ok) {
    window.location.href = '/';
    return;
  }
  currentUser = await userRes.json();
  fetchKeyboards();
}

async function fetchKeyboards() {
  const res = await fetch('/api/keyboards');
  if (res.status === 401) {
    window.location.href = '/';
    return;
  }
  const keyboards = await res.json();
  renderMarket(keyboards);
}

function renderMarket(keyboards) {
  marketItems.innerHTML = '';
  soldItems.innerHTML = '';
  purchasedItems.innerHTML = '';

  keyboards.forEach(kb => {
    const article = document.createElement('article');
    article.style.marginBottom = '1rem';
    const isOwner = kb.sellerId === currentUser.githubId;

    if (kb.status === 'available') {
      const header = document.createElement('header');
      const h3 = document.createElement('h3');
      h3.style.marginBottom = '0';
      h3.textContent = kb.name;
      const small = document.createElement('small');
      small.textContent = `Seller: ${kb.sellerName}`;
      header.appendChild(h3);
      header.appendChild(small);

      const p1 = document.createElement('p');
      p1.style.marginBottom = '0';
      p1.textContent = `Size: ${kb.size} | Price: $${kb.price}`;

      const p2 = document.createElement('p');
      p2.style.marginBottom = '0';
      p2.textContent =
          `Switches: ${kb.switches} | RGB: ${kb.rgb ? 'Yes' : 'No'}`;

      const p3 = document.createElement('p');
      p3.textContent = `Details: ${kb.details || 'None'}`;

      const footer = document.createElement('footer');

      if (isOwner) {
        const div = document.createElement('div');
        div.className = 'grid';

        const editBtn = document.createElement('button');
        editBtn.className = 'secondary edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.dataset.id = kb._id;
        editBtn.dataset.name = kb.name;
        editBtn.dataset.size = kb.size;
        editBtn.dataset.price = kb.price;
        editBtn.dataset.switches = kb.switches;
        editBtn.dataset.rgb = kb.rgb;
        editBtn.dataset.details = kb.details || '';

        const delBtn = document.createElement('button');
        delBtn.className = 'danger delete-btn';
        delBtn.textContent = 'Remove';
        delBtn.dataset.id = kb._id;

        div.appendChild(editBtn);
        div.appendChild(delBtn);
        footer.appendChild(div);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'success buy-btn';
        buyBtn.textContent = 'Buy';
        buyBtn.dataset.id = kb._id;
        footer.appendChild(buyBtn);
      }

      article.append(header, p1, p2, p3, footer);
      marketItems.appendChild(article);

    } else if (kb.status === 'sold') {
      const isBuyer = kb.buyerId === currentUser.githubId;

      if (isOwner || isBuyer) {
        const roleText = isOwner ? `Sold to: ${kb.buyerName}` :
                                   `Purchased from: ${kb.sellerName}`;

        const header = document.createElement('header');
        const h3 = document.createElement('h3');
        h3.style.marginBottom = '0';
        h3.textContent = kb.name;

        const small = document.createElement('small');
        const strong = document.createElement('strong');
        strong.textContent = roleText;
        small.appendChild(strong);
        header.appendChild(h3);
        header.appendChild(small);

        const p1 = document.createElement('p');
        p1.style.marginBottom = '0';
        p1.textContent = `Size: ${kb.size} | Price: $${kb.price}`;

        const p2 = document.createElement('p');
        p2.style.marginBottom = '0';
        p2.textContent =
            `Switches: ${kb.switches} | RGB: ${kb.rgb ? 'Yes' : 'No'}`;

        const p3 = document.createElement('p');
        p3.style.marginBottom = '0';
        p3.textContent = `Details: ${kb.details || 'None'}`;

        article.append(header, p1, p2, p3);

        if (isOwner) {
          soldItems.appendChild(article);
        } else if (isBuyer) {
          purchasedItems.appendChild(article);
        }
      }
    }
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('kbId').value;
  const data = {
    name: document.getElementById('kbName').value,
    size: document.getElementById('kbSize').value,
    price: document.getElementById('kbPrice').value,
    switches: document.querySelector('input[name="switches"]:checked').value,
    rgb: document.getElementById('kbRgb').checked,
    details: document.getElementById('kbDetails').value
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/keyboards/${id}` : '/api/keyboards';

  await fetch(url, {
    method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });

  resetForm();
  fetchKeyboards();
});

marketItems.addEventListener('click', async (e) => {
  if (e.target.matches('.edit-btn')) {
    document.getElementById('kbId').value = e.target.dataset.id;
    document.getElementById('kbName').value = e.target.dataset.name;
    document.getElementById('kbSize').value = e.target.dataset.size;
    document.getElementById('kbPrice').value = e.target.dataset.price;
    document
        .querySelector(
            `input[name="switches"][value="${e.target.dataset.switches}"]`)
        .checked = true;
    document.getElementById('kbRgb').checked = e.target.dataset.rgb === 'true';
    document.getElementById('kbDetails').value = e.target.dataset.details;

    submitBtn.textContent = 'Update Listing';
    cancelBtn.style.display = 'block';
  }

  if (e.target.matches('.delete-btn')) {
    await fetch(`/api/keyboards/${e.target.dataset.id}`, {method: 'DELETE'});
    fetchKeyboards();
  }

  if (e.target.matches('.buy-btn')) {
    await fetch(`/api/buy/${e.target.dataset.id}`, {method: 'POST'});
    fetchKeyboards();
  }
});

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  document.getElementById('kbId').value = '';
  submitBtn.textContent = 'List Item';
  cancelBtn.style.display = 'none';
  document.getElementById('swLinear').checked = true;
}

init();