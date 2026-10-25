/* ============================================================
   KasirKu - POS Application
   ============================================================ */

const STORAGE_KEY = 'kasirku_v1';

const state = {
  products: [],
  cart: [],
  transactions: [],
  page: 'pos',
  search: '',
  category: 'all'
};

/* ---------- Utilities ---------- */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Storage ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.products = data.products || [];
      state.transactions = data.transactions || [];
    }
  } catch (e) { console.error('Load error:', e); }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    products: state.products,
    transactions: state.transactions
  }));
}

/* ---------- Seed Data Demo ---------- */
function seed() {
  if (state.products.length > 0) return;
  const samples = [
    { name: 'Espresso',      category: 'Kopi',     price: 18000, stock: 40 },
    { name: 'Americano',     category: 'Kopi',     price: 20000, stock: 40 },
    { name: 'Cappuccino',    category: 'Kopi',     price: 25000, stock: 30 },
    { name: 'Caffe Latte',   category: 'Kopi',     price: 25000, stock: 30 },
    { name: 'Matcha Latte',  category: 'Non-Kopi', price: 27000, stock: 25 },
    { name: 'Chocolate',     category: 'Non-Kopi', price: 22000, stock: 25 },
    { name: 'Croissant',     category: 'Makanan',  price: 15000, stock: 15 },
    { name: 'Donut',         category: 'Makanan',  price: 10000, stock: 20 },
    { name: 'Cheese Cake',   category: 'Dessert',  price: 30000, stock: 8  },
    { name: 'Brownies',      category: 'Dessert',  price: 20000, stock: 12 },
    { name: 'Ice Tea',       category: 'Minuman',  price: 12000, stock: 50 },
    { name: 'Mineral Water', category: 'Minuman',  price: 8000,  stock: 60 }
  ];
  state.products = samples.map(p => ({ id: uid(), ...p }));
  save();
}

/* ---------- Toast ---------- */
function toast(msg, type = 'info') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Navigation ---------- */
function setPage(page) {
  state.page = page;
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#page-' + page).classList.add('active');
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  render();
}

/* ============================================================
   POS / CASHIER
   ============================================================ */

function getFilteredProducts() {
  return state.products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(state.search.toLowerCase());
    const matchCat = state.category === 'all' || p.category === state.category;
    return matchSearch && matchCat;
  });
}

function renderCategories() {
  const cats = ['all', ...new Set(state.products.map(p => p.category))];
  $('#category-filter').innerHTML = cats.map(c => `
    <button class="cat-btn ${state.category === c ? 'active' : ''}" data-cat="${c}">
      ${c === 'all' ? 'Semua' : c}
    </button>
  `).join('');
}

function renderProductGrid() {
  const list = getFilteredProducts();
  const grid = $('#product-grid');

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>Tidak ada produk ditemukan</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(p => `
    <div class="product-card ${p.stock <= 0 ? 'out-of-stock' : ''}"
         data-id="${p.id}" ${p.stock <= 0 ? '' : 'onclick="addToCart(\'' + p.id + '\')"'}>
      <div class="pc-name">${escapeHtml(p.name)}</div>
      <div class="pc-cat">${escapeHtml(p.category)}</div>
      <div class="pc-price">${fmt(p.price)}</div>
      <div class="pc-stock">Stok: ${p.stock}</div>
    </div>
  `).join('');
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const existing = state.cart.find(c => c.id === productId);
  const inCart = existing ? existing.qty : 0;

  if (inCart >= product.stock) {
    toast('Stok tidak mencukupi', 'error');
    return;
  }

  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    });
  }
  renderCart();
}

function updateCartQty(id, qty) {
  const item = state.cart.find(c => c.id === id);
  if (!item) return;
  const product = state.products.find(p => p.id === id);
  const max = product ? product.stock : 0;

  qty = Math.max(0, Math.min(qty, max));
  if (qty === 0) {
    state.cart = state.cart.filter(c => c.id !== id);
  } else {
    item.qty = qty;
  }
  renderCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(c => c.id !== id);
  renderCart();
}

function getSubtotal() {
  return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function getDiscountPercent() {
  const v = parseFloat($('#discount')?.value) || 0;
  return Math.min(100, Math.max(0, v));
}

function getTotal() {
  const sub = getSubtotal();
  const disc = getDiscountPercent();
  return Math.round(sub - (sub * disc / 100));
}

function renderCart() {
  const container = $('#cart-items');

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <p>Keranjang masih kosong</p>
      </div>`;
  } else {
    container.innerHTML = state.cart.map(i => `
      <div class="cart-item">
        <div class="ci-info">
          <div class="ci-name">${escapeHtml(i.name)}</div>
          <div class="ci-price">${fmt(i.price)}</div>
        </div>
        <div class="ci-qty">
          <button onclick="updateCartQty('${i.id}', ${i.qty - 1})">−</button>
          <input type="number" value="${i.qty}"
                 onchange="updateCartQty('${i.id}', parseInt(this.value)||0)">
          <button onclick="updateCartQty('${i.id}', ${i.qty + 1})">+</button>
        </div>
        <button class="ci-remove" onclick="removeFromCart('${i.id}')">×</button>
      </div>
    `).join('');
  }

  const sub = getSubtotal();
  const disc = getDiscountPercent();
  $('#subtotal').textContent = fmt(sub);
  $('#total').textContent = fmt(getTotal());
  $('#checkout-btn').disabled = state.cart.length === 0;
}

function clearCart() {
  if (state.cart.length === 0) return;
  if (confirm('Kosongkan keranjang?')) {
    state.cart = [];
    renderCart();
  }
}

/* ============================================================
   PAYMENT
   ============================================================ */

let currentTotal = 0;

function openPayment() {
  if (state.cart.length === 0) return;
  currentTotal = getTotal();
  $('#payment-total').textContent = fmt(currentTotal);
  $('#payment-amount').value = '';
  $('#payment-change').textContent = fmt(0);
  $('#payment-confirm').disabled = true;
  $('#payment-modal').classList.add('active');
  setTimeout(() => $('#payment-amount').focus(), 100);
}

function updateChange() {
  const amount = parseFloat($('#payment-amount').value) || 0;
  const change = amount - currentTotal;
  const el = $('#payment-change');
  if (change < 0) {
    el.textContent = 'Kurang ' + fmt(Math.abs(change));
    el.style.color = 'var(--danger)';
    $('#payment-confirm').disabled = true;
  } else {
    el.textContent = fmt(change);
    el.style.color = 'var(--success)';
    $('#payment-confirm').disabled = amount <= 0;
  }
}

function processPayment() {
  const amount = parseFloat($('#payment-amount').value) || 0;
  if (amount < currentTotal) return;

  const sub = getSubtotal();
  const discPct = getDiscountPercent();
  const discountAmount = sub - currentTotal;

  const transaction = {
    id: 'TRX-' + Date.now().toString().slice(-6),
    date: new Date().toISOString(),
    items: state.cart.map(i => ({ ...i })),
    subtotal: sub,
    discount: discountAmount,
    discountPercent: discPct,
    total: currentTotal,
    paid: amount,
    change: amount - currentTotal
  };

  // Reduce stock
  state.cart.forEach(item => {
    const product = state.products.find(p => p.id === item.id);
    if (product) {
      product.stock = Math.max(0, product.stock - item.qty);
    }
  });

  state.transactions.unshift(transaction);
  save();

  // Reset
  state.cart = [];
  $('#discount').value = 0;
  $('#payment-modal').classList.remove('active');
  renderCart();
  renderProductGrid();

  showReceipt(transaction);
  toast('Pembayaran berhasil!', 'success');
}

/* ============================================================
   RECEIPT
   ============================================================ */

function showReceipt(trx) {
  const date = new Date(trx.date);
  const dateStr = date.toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  $('#receipt-body').innerHTML = `
    <div class="receipt-header">
      <h2>🛒 KasirKu</h2>
      <p>Jl. Contoh No. 123, Jakarta</p>
      <p>Telp: 021-1234567</p>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row"><span>No. Transaksi</span><span>${trx.id}</span></div>
    <div class="receipt-row"><span>Tanggal</span><span>${dateStr}</span></div>
    <div class="receipt-divider"></div>
    <div class="receipt-items">
      ${trx.items.map(i => `
        <div class="receipt-item">
          <div class="receipt-item-name">${escapeHtml(i.name)}</div>
          <div class="receipt-item-detail">
            <span>${i.qty} x ${fmt(i.price)}</span>
            <span>${fmt(i.price * i.qty)}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row"><span>Subtotal</span><span>${fmt(trx.subtotal)}</span></div>
    ${trx.discount > 0 ? `<div class="receipt-row"><span>Diskon (${trx.discountPercent}%)</span><span>-${fmt(trx.discount)}</span></div>` : ''}
    <div class="receipt-divider"></div>
    <div class="receipt-total"><span>TOTAL</span><span>${fmt(trx.total)}</span></div>
    <div class="receipt-row"><span>Tunai</span><span>${fmt(trx.paid)}</span></div>
    <div class="receipt-row"><span>Kembali</span><span>${fmt(trx.change)}</span></div>
    <div class="receipt-divider"></div>
    <div class="receipt-footer">
      <p>Terima kasih atas kunjungan Anda 🙏</p>
      <p>Barang yang sudah dibeli tidak dapat ditukar</p>
    </div>
  `;
  $('#receipt-modal').classList.add('active');
}

/* ============================================================
   PRODUCT MANAGEMENT
   ============================================================ */

function renderProductsTable() {
  const tbody = $('#products-table-body');
  if (state.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">Belum ada produk. Klik "Tambah Produk" untuk memulai.</td></tr>`;
    return;
  }
  tbody.innerHTML = state.products.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.category)}</td>
      <td>${fmt(p.price)}</td>
      <td>
        <span class="badge ${p.stock < 10 ? 'badge-danger' : p.stock < 20 ? 'badge-warning' : 'badge-success'}">
          ${p.stock}
        </span>
      </td>
      <td>
        <button class="btn-icon" onclick="editProduct('${p.id}')">✏️ Edit</button>
        <button class="btn-icon danger" onclick="deleteProduct('${p.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openProductModal(product = null) {
  $('#modal-title').textContent = product ? 'Edit Produk' : 'Tambah Produk';
  $('#product-id').value = product ? product.id : '';
  $('#product-name').value = product ? product.name : '';
  $('#product-category').value = product ? product.category : '';
  $('#product-price').value = product ? product.price : '';
  $('#product-stock').value = product ? product.stock : '';

  // Update category suggestions
  const cats = [...new Set(state.products.map(p => p.category))];
  $('#category-list').innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');

  $('#product-modal').classList.add('active');
  setTimeout(() => $('#product-name').focus(), 100);
}

function editProduct(id) {
  const product = state.products.find(p => p.id === id);
  if (product) openProductModal(product);
}

function deleteProduct(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`Hapus produk "${product.name}"?`)) return;
  state.products = state.products.filter(p => p.id !== id);
  state.cart = state.cart.filter(c => c.id !== id);
  save();
  render();
  toast('Produk dihapus', 'success');
}

function handleProductSubmit(e) {
  e.preventDefault();
  const id = $('#product-id').value;
  const data = {
    name: $('#product-name').value.trim(),
    category: $('#product-category').value.trim(),
    price: parseFloat($('#product-price').value) || 0,
    stock: parseInt($('#product-stock').value) || 0
  };

  if (!data.name || !data.category) return toast('Data tidak lengkap', 'error');

  if (id) {
    const product = state.products.find(p => p.id === id);
    if (product) Object.assign(product, data);
    toast('Produk diperbarui', 'success');
  } else {
    state.products.push({ id: uid(), ...data });
    toast('Produk ditambahkan', 'success');
  }

  save();
  $('#product-modal').classList.remove('active');
  render();
}

/* ============================================================
   HISTORY
   ============================================================ */

function renderHistory() {
  const tbody = $('#history-table-body');
  if (state.transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">Belum ada transaksi</td></tr>`;
    return;
  }
  tbody.innerHTML = state.transactions.map(t => {
    const date = new Date(t.date).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const itemCount = t.items.reduce((s, i) => s + i.qty, 0);
    return `
      <tr>
        <td><strong>${t.id}</strong></td>
        <td>${date}</td>
        <td>${itemCount} item</td>
        <td><strong>${fmt(t.total)}</strong></td>
        <td><button class="btn-icon" onclick="reprintReceipt('${t.id}')">🧾 Struk</button></td>
      </tr>
    `;
  }).join('');
}

function reprintReceipt(id) {
  const trx = state.transactions.find(t => t.id === id);
  if (trx) showReceipt(trx);
}

/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard() {
  const todayStr = today();
  const todayTrx = state.transactions.filter(t => t.date.slice(0, 10) === todayStr);

  const revenue = todayTrx.reduce((s, t) => s + t.total, 0);
  const trxCount = todayTrx.length;
  const productCount = state.products.length;
  const lowStock = state.products.filter(p => p.stock < 10);

  $('#stat-revenue').textContent = fmt(revenue);
  $('#stat-transactions').textContent = trxCount;
  $('#stat-products').textContent = productCount;
  $('#stat-lowstock').textContent = lowStock.length;

  const tbody = $('#lowstock-table-body');
  if (lowStock.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--text-muted)">Semua stok aman ✓</td></tr>`;
  } else {
    tbody.innerHTML = lowStock.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(p.category)}</td>
        <td><span class="badge badge-danger">${p.stock}</span></td>
      </tr>
    `).join('');
  }
}

/* ============================================================
   RENDER ROUTER
   ============================================================ */

function render() {
  if (state.page === 'pos') {
    renderCategories();
    renderProductGrid();
    renderCart();
  } else if (state.page === 'products') {
    renderProductsTable();
  } else if (state.page === 'history') {
    renderHistory();
  } else if (state.page === 'dashboard') {
    renderDashboard();
  }
}

/* ============================================================
   HELPERS
   ============================================================ */

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function setupEvents() {
  // Navigation
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      setPage(item.dataset.page);
    });
  });

  // Search
  $('#search-product').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderProductGrid();
  });

  // Category filter
  $('#category-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    state.category = btn.dataset.cat;
    renderCategories();
    renderProductGrid();
  });

  // Cart controls
  $('#clear-cart').addEventListener('click', clearCart);
  $('#discount').addEventListener('input', renderCart);
  $('#checkout-btn').addEventListener('click', openPayment);

  // Product modal
  $('#add-product-btn').addEventListener('click', () => openProductModal());
  $('#modal-close').addEventListener('click', () => $('#product-modal').classList.remove('active'));
  $('#modal-cancel').addEventListener('click', () => $('#product-modal').classList.remove('active'));
  $('#product-form').addEventListener('submit', handleProductSubmit);

  // Payment modal
  $('#payment-close').addEventListener('click', () => $('#payment-modal').classList.remove('active'));
  $('#payment-cancel').addEventListener('click', () => $('#payment-modal').classList.remove('active'));
  $('#payment-amount').addEventListener('input', updateChange);
  $('#payment-confirm').addEventListener('click', processPayment);

  $('#quick-amounts').addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-btn');
    if (!btn) return;
    const val = btn.dataset.amount;
    if (val === 'exact') {
      $('#payment-amount').value = currentTotal;
    } else {
      $('#payment-amount').value = val;
    }
    updateChange();
  });

  // Receipt modal
  $('#receipt-close').addEventListener('click', () => $('#receipt-modal').classList.remove('active'));

  // Reset data
  $('#reset-data-btn').addEventListener('click', () => {
    if (!confirm('Hapus SEMUA data (produk, transaksi, keranjang)? Tindakan ini tidak bisa dibatalkan.')) return;
    localStorage.removeItem(STORAGE_KEY);
    state.products = [];
    state.transactions = [];
    state.cart = [];
    seed();
    render();
    toast('Data telah direset', 'success');
  });

  // Close modal on backdrop click
  $$('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // ESC key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal').forEach(m => m.classList.remove('active'));
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */

function init() {
  load();
  seed();
  setupEvents();
  render();
}

document.addEventListener('DOMContentLoaded', init);

// Global functions for inline onclick
window.addToCart = addToCart;
window.updateCartQty = updateCartQty;
window.removeFromCart = removeFromCart;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.reprintReceipt = reprintReceipt;
