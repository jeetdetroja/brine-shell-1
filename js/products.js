/* =========================================
   BRINE & SHELL — Product Catalog
   Single source of truth for product data and
   site-wide commerce config (used by index.html
   and shop.html so price/description/image can
   never drift between pages).
   ========================================= */
window.SITE_CONFIG = {
  freeDeliveryThreshold: 499,
  deliveryFee: 49,
};

window.PRODUCTS = [
  {
    id: 'cubes',
    name: 'Peanut Butter Cubes',
    price: 299,
    wt: '10 cubes',
    badge: 'Bestseller',
    bc: 'badge-default',
    img: 'images/peanut-butter-cubes.jpeg',
    tags: ['High Protein', 'Non-GMO', 'No Preservatives', 'Easy to Spread'],
    desc: '10 individually wrapped cubes. Portioned perfection for your workout or morning toast.',
  },
  {
    id: 'dual',
    name: 'Dual Flavor Jar',
    price: 549,
    wt: '400g',
    badge: 'New',
    bc: 'badge-new',
    img: 'images/peanut-butter-jar.jpeg',
    tags: ['High Protein', 'Non-GMO', 'No Preservatives', 'Easy Scooping'],
    desc: '2 flavors, 1 jar. Crunchy Peanut Butter + Protein Peanut Butter. Wide-mouth for easy scooping.',
  },
  {
    id: 'fuel',
    name: 'Peanut Butter Fuel Pack',
    price: 99,
    wt: '30g sachet',
    badge: null,
    bc: '',
    img: 'images/peanut-butter-shashe.jpeg',
    tags: ['High Protein', 'Non-GMO', 'No Preservatives', 'Easy to Spread'],
    desc: 'On-the-go 30g sachet for athletes, hikers, commuters — anyone who needs quick fuel.',
  },
  {
    id: 'ceramic',
    name: 'Peanut Butter Ceramic Jar',
    price: 699,
    wt: '500g',
    badge: 'Premium',
    bc: 'badge-premium',
    img: 'images/peanut-butter-ceramic.jpeg',
    tags: ['High Protein', 'Non-GMO', 'No Preservatives', 'Easy to Spread'],
    desc: 'Premium peanut-shaped ceramic jar. Made with 100% real peanuts. A kitchen showpiece.',
  },
];

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

/* Fills in any element tagged data-fd-amount / data-fd-fee with the
   live free-delivery config, so the ₹499 / ₹49 figures quoted in page
   copy can never drift from the number the cart actually charges. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-fd-amount]').forEach(el => {
    el.textContent = '₹' + SITE_CONFIG.freeDeliveryThreshold;
  });
  document.querySelectorAll('[data-fd-fee]').forEach(el => {
    el.textContent = '₹' + SITE_CONFIG.deliveryFee;
  });
});
