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
      let buttons = '';
      if (isOwner) {
        buttons = `
          <div class="grid">
            <button class="secondary" onclick="editKb('${kb._id}', '${
            kb.name}', '${kb.size}', ${kb.price}, '${kb.switches}', ${
            kb.rgb}, '${kb.details}')">Edit</button>
            <button class="danger" onclick="deleteKb('${
            kb._id}')">Remove</button>
          </div>
        `;
      } else {
        buttons =
            `<button class="success" onclick="buyKb('${kb._id}')">Buy</button>`;
      }

      article.innerHTML = `
        <header>
          <h3 style="margin-bottom: 0;">${kb.name}</h3>
          <small>Seller: ${kb.sellerName}</small>
        </header>
        <p style="margin-bottom: 0;"><strong>Size:</strong> ${
          kb.size} | <strong>Price:</strong> $${kb.price}</p>
        <p style="margin-bottom: 0;"><strong>Switches:</strong> ${
          kb.switches} | <strong>RGB:</strong> ${kb.rgb ? 'Yes' : 'No'}</p>
        <p><strong>Details:</strong> ${kb.details || 'None'}</p>
        <footer>${buttons}</footer>
      `;
      marketItems.appendChild(article);
    } else if (kb.status === 'sold') {
      const isBuyer = kb.buyerId === currentUser.githubId;

      if (isOwner || isBuyer) {
        const roleText = isOwner ? `Sold to: ${kb.buyerName}` :
                                   `Purchased from: ${kb.sellerName}`;

        article.innerHTML = `
          <header>
            <h3 style="margin-bottom: 0;">${kb.name}</h3>
            <small><strong>${roleText}</strong></small>
          </header>
          <p style="margin-bottom: 0;"><strong>Size:</strong> ${
            kb.size} | <strong>Price:</strong> $${kb.price}</p>
          <p style="margin-bottom: 0;"><strong>Switches:</strong> ${
            kb.switches} | <strong>RGB:</strong> ${kb.rgb ? 'Yes' : 'No'}</p>
          <p style="margin-bottom: 0;"><strong>Details:</strong> ${
            kb.details || 'None'}</p>
        `;

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

window.editKb = (id, name, size, price, switches, rgb, details) => {
  document.getElementById('kbId').value = id;
  document.getElementById('kbName').value = name;
  document.getElementById('kbSize').value = size;
  document.getElementById('kbPrice').value = price;
  document.querySelector(`input[name="switches"][value="${switches}"]`)
      .checked = true;
  document.getElementById('kbRgb').checked = rgb;
  document.getElementById('kbDetails').value =
      details !== 'undefined' ? details : '';

  submitBtn.textContent = 'Update Listing';
  cancelBtn.style.display = 'block';
};

window.deleteKb = async (id) => {
  await fetch(`/api/keyboards/${id}`, {method: 'DELETE'});
  fetchKeyboards();
};

window.buyKb = async (id) => {
  await fetch(`/api/buy/${id}`, {method: 'POST'});
  fetchKeyboards();
};

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  document.getElementById('kbId').value = '';
  submitBtn.textContent = 'List Item';
  cancelBtn.style.display = 'none';
  document.getElementById('swLinear').checked = true;
}

init();