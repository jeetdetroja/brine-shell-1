/* =========================================
   BRINE & SHELL — Product Catalog Loader
   Single source of truth is data/products.json,
   which this file loads AND which the backend
   (backend/server.js) reads directly on the
   server for price verification. Never hardcode
   prices/descriptions here or in any page again —
   edit data/products.json instead.
   ========================================= */

window.PRODUCTS = [];
window.SITE_CONFIG = {};

window.PRODUCTS_READY = fetch('data/products.json')
  .then(res => {
    if (!res.ok) throw new Error('Failed to load product catalog: ' + res.status);
    return res.json();
  })
  .then(data => {
    window.PRODUCTS = data.products;
    window.SITE_CONFIG = data.config;
    document.querySelectorAll('[data-fd-amount]').forEach(el => {
      el.textContent = '₹' + SITE_CONFIG.freeDeliveryThreshold;
    });
    document.querySelectorAll('[data-fd-fee]').forEach(el => {
      el.textContent = '₹' + SITE_CONFIG.deliveryFee;
    });
    return window.PRODUCTS;
  })
  .catch(err => {
    console.error(err);
    return [];
  });

/* Renders read-only preview cards (used on the homepage — CTA links to
   the shop instead of adding to a cart) so home and shop never show
   different copy for the same product. */
function renderProductPreviewCards(containerId, products) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="pc-img">
        <img src="${p.img}" alt="${p.name}" width="600" height="600" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
        <div class="ph" style="display:none">🥜<p>${p.name.split(' ')[0]}</p></div>
        ${p.badge ? `<span class="pc-badge ${p.bc}">${p.badge}</span>` : ''}
      </div>
      <div class="pc-body">
        <h3>${p.name}</h3>
        <p class="wt">${p.wt}</p>
        <p>${p.desc}</p>
        <div class="pc-footer"><span class="price">₹${p.price}</span><a href="shop.html" class="btn-sm">Add to Cart</a></div>
      </div>
    </div>`).join('');
}
