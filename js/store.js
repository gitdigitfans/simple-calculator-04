// Static hosting navigation compatibility
function getStaticPageUrl(pathname, search = '') {
  const staticPages = new Set(['/products', '/about', '/contact', '/dashboard', '/admin', '/checkout', '/thank-you']);

  if (pathname === '/' || pathname === '/index.html') return '/' + search;
  if (staticPages.has(pathname)) return pathname + '.html' + search;

  if (pathname.startsWith('/product/')) {
    const id = pathname.split('/').filter(Boolean).pop();
    return id ? '/product.html?id=' + encodeURIComponent(id) : '/products.html';
  }

  return null;
}

function goToPage(pathname, search = '') {
  const staticUrl = getStaticPageUrl(pathname, search);
  window.location.href = staticUrl || (pathname + search);
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || link.target === '_blank' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const url = new URL(link.getAttribute('href'), window.location.origin);
  if (url.origin !== window.location.origin) return;

  const staticUrl = getStaticPageUrl(url.pathname, url.search);
  if (!staticUrl || staticUrl === window.location.pathname + window.location.search) return;

  event.preventDefault();
  window.location.href = staticUrl;
});

let products = [];
let categories = [];
let coupons = [];
let cart = [];
let orders = [];
let appliedCouponCode = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('appliedCouponCode')) || null;
let offerInterval = null;

function setAppliedCoupon(code) {
  appliedCouponCode = code || null;
  try {
    if (code) sessionStorage.setItem('appliedCouponCode', code);
    else sessionStorage.removeItem('appliedCouponCode');
  } catch (e) {}
}


function normalizeProduct(p) {
  const base = {
    ...p,
    category: p.category_id ? categories.find(c => String(c.id) === String(p.category_id))?.slug || '' : '',
    custom_sizes: p.custom_sizes || p.customSizes || '',
  };
  const cs = base.custom_sizes;
  const hasCustom = typeof cs === 'string' ? cs.trim().length > 0 : Array.isArray(cs) && cs.length > 0;
  if (p.warehouses && p.warehouses.length > 0 && hasCustom) {
    const stockMap = {};
    for (const wh of p.warehouses) for (const item of wh.items) stockMap[item.size] = (stockMap[item.size] || 0) + (item.stock || 0);
    const variants = Object.entries(stockMap).map(([size, stock]) => ({ id: size, size, stock }));
    return { ...base, variants, product_variants: variants };
  }
  return { ...base, variants: (p.product_variants || []).map(v => ({ id: v.id, size: v.size, stock: v.stock })) };
}

function getAvailableSizes(product) {
  return product.variants.filter(v => v.stock > 0).map(v => v.size);
}

function getTotalStock(product) {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

async function initStore() {
  try {
    const [prodData, catData, coupData] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchCoupons(),
    ]);
    if (catData && catData.length > 0) {
      categories = catData.map(c => ({ ...c, slug: c.slug || c.id, hidden: c.hidden || false, parent_id: c.parent_id || null }));
    }
    if (coupData && coupData.length > 0) {
      coupons = coupData;
    }
    if (prodData && prodData.length > 0) {
      products = prodData.map(normalizeProduct);
    }
  } catch (err) {
    console.error('Supabase initStore failed:', err.message);
    throw err;
  }

  // Load cart from localStorage
  try {
    const savedCart = localStorage.getItem('cuteKidsCart');
    cart = savedCart ? JSON.parse(savedCart) : [];
  } catch (e) {
    cart = [];
    localStorage.removeItem('cuteKidsCart');
  }

  initLang();
  await loadOrders();
  renderProducts();
  renderFilters();
  renderCart();
  startOfferBannerInterval();
}

async function refreshProducts() {
  try {
    const prodData = await fetchProducts();
    if (prodData && prodData.length > 0) {
      products = prodData.map(normalizeProduct);
    }
  } catch (err) {
    console.error('Failed to refresh products:', err);
  }
}

async function loadOrders() {
  if (currentUser) {
    try {
      orders = await fetchMyOrders(currentUser.id);
    } catch (e) {
      orders = [];
    }
  } else {
    orders = [];
  }
}

async function updateVariantStock(productId, size, newStock) {
  try {
    await supabaseFetch(
      `/rest/v1/product_variants?product_id=eq.${productId}&size=eq.${encodeURIComponent(size)}`,
      { method: 'PATCH', body: JSON.stringify({ stock: newStock }) }
    );
  } catch (err) {
    console.error('Failed to update stock in Supabase:', err);
    throw err;
  }
}

// ===================== SUBCATEGORY HELPERS =====================
function getSubcategories(slug) {
  const cat = categories.find(c => c.slug === slug);
  if (!cat) return [];
  const catId = cat.id;
  return categories.filter(c => String(c.parent_id) === String(catId));
}

function isParentCategory(slug) {
  return getSubcategories(slug).length > 0;
}

function getAllCategorySlugs(slug) {
  const slugs = [slug];
  const cat = categories.find(c => c.slug === slug);
  if (cat) {
    const subcats = getSubcategories(slug);
    for (const sub of subcats) slugs.push(sub.slug);
  }
  return slugs;
}

// ===================== FILTERS =====================
let filters = { category: null, subcategory: null, availability: 'all', size: null };

function getFilteredProducts() {
  const hiddenCats = categories.filter(c => c.hidden);
  const hiddenSlugs = new Set();
  for (const hc of hiddenCats) {
    hiddenSlugs.add(hc.slug);
    for (const sub of getSubcategories(hc.slug)) hiddenSlugs.add(sub.slug);
  }
  let result = [...products].filter(p => !hiddenSlugs.has(p.category));
  if (filters.category) {
    const catSlugs = getAllCategorySlugs(filters.category);
    result = result.filter(p => catSlugs.includes(p.category));
  }
  if (filters.subcategory) {
    result = result.filter(p => p.category === filters.subcategory);
  }
  if (filters.availability === 'available') {
    result = result.filter(p => getTotalStock(p) > 0);
  }
  if (filters.size && filters.size.length > 0) {
    result = result.filter(p => filters.size.some(s => {
      const variant = p.variants.find(v => v.size === s);
      return variant && variant.stock > 0;
    }));
  }
  return result;
}

function getAllSizes() {
  const hiddenCats = categories.filter(c => c.hidden);
  const hiddenSlugs = new Set();
  for (const hc of hiddenCats) {
    hiddenSlugs.add(hc.slug);
    for (const sub of getSubcategories(hc.slug)) hiddenSlugs.add(sub.slug);
  }
  const sizeSet = new Set();
  products.filter(p => !hiddenSlugs.has(p.category)).forEach(p => p.variants.forEach(v => sizeSet.add(v.size)));
  return [...sizeSet].sort((a, b) => {
    const aNum = Number(a), bNum = Number(b);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (!isNaN(aNum)) return -1;
    if (!isNaN(bNum)) return 1;
    return a.localeCompare(b);
  });
}

function renderFilters() {
  const container = document.getElementById('filtersContainer');
  if (!container) return;
  const lang = currentLang;

  let html = `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
      <h3 class="text-lg font-bold mb-4 text-[#1D355E]" data-i18n="filterBy">${t('filterBy')}</h3>
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2" data-i18n="category">${t('category')}</label>
          <select id="filterCategory" onchange="onFilterCategoryChange()" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] focus:border-[#F3B423] outline-none bg-white">
            <option value="" ${!filters.category ? 'selected' : ''}>${t('allCategories')}</option>
            ${categories.filter(c => !c.hidden && !c.parent_id).map(cat => `
              <option value="${cat.slug}" ${filters.category === cat.slug ? 'selected' : ''}>${lang === 'ar' ? cat.name_ar : cat.name_en}</option>
            `).join('')}
          </select>
        </div>
        <div id="subcategoryFilter" class="${filters.category && isParentCategory(filters.category) ? '' : 'hidden'}">
          <label class="block text-sm font-semibold text-gray-700 mb-2">التصنيف الفرعي</label>
          <div class="flex flex-wrap gap-2">
            <button onclick="setFilterSubcategory('')" class="px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-200 ${!filters.subcategory ? 'bg-[#1D355E] text-white border-[#1D355E]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#F3B423]'}">${t('all') || 'الكل'}</button>
            ${getSubcategories(filters.category).filter(c => !c.hidden).map(sub => `
              <button onclick="setFilterSubcategory('${sub.slug}')" class="px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-200 ${filters.subcategory === sub.slug ? 'bg-[#F3B423] text-[#1D355E] border-[#F3B423]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#F3B423]'}">${lang === 'ar' ? sub.name_ar : sub.name_en}</button>
            `).join('')}
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">${t('available')}</label>
          <select id="filterAvailability" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] focus:border-[#F3B423] outline-none bg-white">
            <option value="all" ${filters.availability === 'all' ? 'selected' : ''}>${t('allAvailability')}</option>
            <option value="available" ${filters.availability === 'available' ? 'selected' : ''}>${t('availableOnly')}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">${t('size')}</label>
          <div class="grid grid-cols-4 gap-2">
            ${getAllSizes().map(s => {
              const isActive = filters.size && filters.size.includes(s);
              const disabled = !products.some(p => {
                const v = p.variants.find(v => v.size === s);
                return v && v.stock > 0;
              });
              return `
                <button onclick="setFilterSize('${s}')"
                  class="size-filter-btn px-2 py-2 text-xs font-medium rounded-xl border transition-all duration-200
                  ${isActive ? 'bg-[#1D355E] text-white border-[#1D355E] shadow-md' : disabled ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:border-[#F3B423] hover:text-[#1D355E]'}">
                  ${s}
                </button>
              `;
            }).join('')}
            <button onclick="clearSizeFilter()"
              class="px-2 py-2 text-xs font-medium rounded-xl border transition-all duration-200
              ${!filters.size || filters.size.length === 0 ? 'bg-[#1D355E] text-white border-[#1D355E] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-[#F3B423]'}">
              ${t('allSizes')}
            </button>
          </div>
        </div>
        <button onclick="clearFilters()" class="w-full py-2.5 text-sm font-semibold text-[#1D355E] border-2 border-[#1D355E] rounded-xl hover:bg-[#1D355E] hover:text-white transition-all duration-200" data-i18n="clearFilters">${t('clearFilters')}</button>
      </div>
    </div>
  `;
  container.innerHTML = html;

  // filterCategory change handled by onFilterCategoryChange()
  document.getElementById('filterAvailability')?.addEventListener('change', function () {
    filters.availability = this.value;
    renderProducts();
    renderFilters();
  });
}

function onFilterCategoryChange() {
  const sel = document.getElementById('filterCategory');
  filters.category = sel?.value || null;
  filters.subcategory = null;
  renderProducts();
  renderFilters();
}

function setFilterSubcategory(slug) {
  filters.subcategory = slug || null;
  renderProducts();
  renderFilters();
}

function setFilterSize(size) {
  if (!filters.size) filters.size = [];
  const idx = filters.size.indexOf(size);
  if (idx > -1) {
    filters.size.splice(idx, 1);
  } else {
    filters.size.push(size);
  }
  if (filters.size.length === 0) filters.size = null;
  renderProducts();
  renderFilters();
}

function clearSizeFilter() {
  filters.size = null;
  renderProducts();
  renderFilters();
}

function clearFilters() {
  filters = { category: null, subcategory: null, availability: 'all', size: null };
  renderProducts();
  renderFilters();
}

// ===================== PRODUCTS =====================
function renderProducts() {
  const container = document.getElementById('productsGrid');
  if (!container) return;
  const filtered = getFilteredProducts();
  const lang = currentLang;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        <p class="text-xl text-gray-500 font-medium" data-i18n="noProducts">${t('noProducts')}</p>
        <button onclick="clearFilters()" class="mt-4 px-6 py-2.5 bg-[#1D355E] text-white rounded-xl hover:bg-[#2B4A7A] transition" data-i18n="clearFilters">${t('clearFilters')}</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => {
    const totalStock = getTotalStock(product);
    const sizes = getAvailableSizes(product);
    const cat = categories.find(c => c.slug === product.category);
    const catName = lang === 'ar' ? cat?.name_ar : cat?.name_en;

    return `
      <div class="product-card group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5">
        <div class="relative overflow-hidden aspect-[4/5] bg-gray-50 cursor-pointer" onclick="openProductDetail(${product.id})">
          <img src="${product.images?.[0] || ''}" alt="${lang === 'ar' ? product.name_ar : product.name_en}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
          ${totalStock === 0 ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm"><span class="text-white text-lg font-bold bg-red-500/90 px-4 py-2 rounded-xl">' + t('outOfStock') + '</span></div>' : ''}
          <div class="absolute top-3 right-3 flex flex-col gap-1.5">
            <span class="bg-white/90 backdrop-blur-sm text-[#1D355E] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">${catName}</span>
          </div>
          <button onclick="event.stopPropagation(); openProductDetail(${product.id})" class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-sm font-bold flex items-center justify-center gap-2 hover:underline">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            ${t('quickView') || 'عرض سريع'}
          </button>
        </div>
        <div class="p-4">
          <h3 class="font-bold text-[#1D355E] text-sm mb-1 line-clamp-2 cursor-pointer hover:text-brand-yellow transition-colors duration-200" onclick="openProductDetail(${product.id})">
            ${lang === 'ar' ? product.name_ar : product.name_en}
          </h3>
          <div class="text-brand-yellow font-black text-lg mb-2">${product.price} <span class="text-gray-400 text-xs font-normal">${t('egp')}</span></div>
          ${totalStock > 0 ? `
          <div class="flex items-center gap-2 mb-2">
            <select id="sizeSelect_${product.id}" class="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow appearance-none cursor-pointer">
              <option value="">${t('size')}</option>
              ${product.variants.filter(v => v.stock > 0).map(v => `<option value="${v.size}">${t('size') + ' ' + v.size}${v.stock <= 3 ? ' (' + v.stock + ')' : ''}</option>`).join('')}
            </select>
          </div>
          <button onclick="addToCartFromCard(${product.id})" class="w-full bg-brand-yellow hover:bg-[#D49A1A] text-brand-navy text-xs font-bold py-2.5 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-brand-yellow/30 active:scale-95">
            ${t('addToCart')}
          </button>
          ` : `<div class="text-xs text-red-400 font-semibold text-center py-2">${t('outOfStock')}</div>`}
        </div>
      </div>
    `;
  }).join('');
}

// ===================== PRODUCT DETAIL MODAL =====================
let selectedProductId = null;
let selectedSize = null;
let selectedQty = 1;

function openProductDetail(id) {
  if (!id) return;
  window.location.href = '/product.html?id=' + encodeURIComponent(id);
}

function closeProductDetail() {
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
}

function renderProductDetail() {
  const p = products.find(p => p.id === selectedProductId);
  if (!p) return;
  renderProductDetailContent(p);
}

function renderProductDetailContent(product) {
  const container = document.getElementById('productDetailContent');
  if (!container) return;
  const lang = currentLang;
  const cat = categories.find(c => c.slug === product.category);
  const catName = lang === 'ar' ? cat?.name_ar : cat?.name_en;
  window._galleryImages = product.images || [];
  window._galleryIndex = 0;

  container.innerHTML = `
    <div class="flex flex-col md:flex-row gap-6">
      <div class="md:w-1/2">
        <div class="aspect-[4/5] bg-gray-50 rounded-2xl overflow-hidden relative" id="modalMainImage">
          <img src="${product.images?.[0] || ''}" alt="${lang === 'ar' ? product.name_ar : product.name_en}" class="w-full h-full object-cover transition-opacity duration-300" id="modalMainImg">
          ${(product.images?.length || 0) > 1 ? `
          <button onclick="prevGalleryImage()" class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition" id="galleryPrevBtn"><svg class="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
          <button onclick="nextGalleryImage()" class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition" id="galleryNextBtn"><svg class="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
          ` : ''}
        </div>
        ${(product.images?.length || 0) > 1 ? `
        <div class="flex gap-2 mt-3 overflow-x-auto pb-1" id="galleryThumbs">
          ${product.images.map((img, i) => `
            <button onclick="showGalleryImage(${i})" class="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 ${i === 0 ? 'border-[#F3B423]' : 'border-gray-200'} hover:border-[#F3B423] transition gallery-thumb" data-index="${i}">
              <img src="${img}" class="w-full h-full object-cover">
            </button>
          `).join('')}
        </div>
        ` : ''}
      </div>
      <div class="md:w-1/2 flex flex-col">
        <span class="text-xs font-semibold text-[#F3B423] bg-[#F3B423]/10 px-3 py-1 rounded-full w-fit mb-2">${catName}</span>
        <h2 class="text-2xl font-bold text-[#1D355E] mb-2">${lang === 'ar' ? product.name_ar : product.name_en}</h2>
        <div class="flex items-center gap-2 mb-4">
          <span class="text-3xl font-bold text-[#F3B423]">${product.price}</span>
          <span class="text-gray-500">${t('egp')}</span>
        </div>
        <p class="text-gray-600 text-sm mb-6 leading-relaxed">${lang === 'ar' ? product.description_ar : product.description_en}</p>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-3">${t('size')}</label>
          <div class="flex flex-wrap gap-2">
            ${product.variants.map(v => {
              const isAvail = v.stock > 0;
              const isSelected = selectedSize === v.size;
              return `
                <button onclick="selectSizeDetail('${v.size}')"
                  class="px-5 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all duration-200
                  ${isSelected ? 'bg-[#1D355E] text-white border-[#1D355E] shadow-md' : isAvail ? 'bg-white text-gray-700 border-gray-200 hover:border-[#F3B423] hover:text-[#1D355E]' : 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through'}"
                  ${!isAvail ? 'disabled' : ''}>
                  ${v.size}
                  ${isAvail && v.stock <= 3 ? `<span class="block text-[10px] font-normal ${isSelected ? 'text-white/70' : 'text-red-400'}">${v.stock} ${t('stockLeft')}</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-3">${t('quantity')}</label>
          <div class="flex items-center gap-3">
            <button onclick="changeQty(-1)" class="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 transition">−</button>
            <span class="text-xl font-bold text-[#1D355E] w-8 text-center">${selectedQty}</span>
            <button onclick="changeQty(1)" class="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 transition">+</button>
          </div>
        </div>

        <button onclick="addToCartFromDetail()" class="w-full py-3.5 bg-[#F3B423] hover:bg-[#D49A1A] text-[#1D355E] font-bold text-lg rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#F3B423]/30 flex items-center justify-center gap-2 mt-auto">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>
          ${t('addToCart')}
        </button>
      </div>
    </div>
  `;
}

// Product gallery
window._galleryIndex = 0;
window._galleryImages = [];

function showGalleryImage(i) {
  window._galleryIndex = i;
  const img = document.getElementById('modalMainImg');
  if (img) img.src = window._galleryImages[i];
  document.querySelectorAll('.gallery-thumb').forEach((el, idx) => {
    el.classList.toggle('border-[#F3B423]', idx === i);
    el.classList.toggle('border-gray-200', idx !== i);
  });
}

function nextGalleryImage() {
  const len = window._galleryImages.length;
  if (len < 2) return;
  showGalleryImage((window._galleryIndex + 1) % len);
}

function prevGalleryImage() {
  const len = window._galleryImages.length;
  if (len < 2) return;
  showGalleryImage((window._galleryIndex - 1 + len) % len);
}

function selectSizeDetail(size) {
  selectedSize = size;
  renderProductDetailContent(products.find(p => p.id === selectedProductId));
}

function changeQty(delta) {
  selectedQty = Math.max(1, selectedQty + delta);
  const product = products.find(p => p.id === selectedProductId);
  if (product && selectedSize) {
    const variant = product.variants.find(v => v.size === selectedSize);
    if (variant) selectedQty = Math.min(selectedQty, variant.stock);
  }
  renderProductDetailContent(products.find(p => p.id === selectedProductId));
}

function addToCartFromCard(productId) {
  const select = document.getElementById('sizeSelect_' + productId);
  const size = select?.value;
  if (!size) {
    alert(currentLang === 'ar' ? 'يرجى اختيار المقاس' : 'Please select a size');
    select?.focus();
    return;
  }
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const variant = product.variants.find(v => v.size === size);
  if (!variant || variant.stock < 1) {
    alert(currentLang === 'ar' ? 'المقاس غير متوفر' : 'Size not available');
    return;
  }

  const qty = 1;
  const existing = cart.find(item => item.productId === product.id && item.size === size);
  if (existing) {
    existing.quantity += qty;
    if (existing.quantity > variant.stock) existing.quantity = variant.stock;
  } else {
    cart.push({
      productId: product.id,
      size: size,
      quantity: qty,
      price: product.price,
      name_ar: product.name_ar,
      name_en: product.name_en,
      category: product.category,
      image: product.images?.[0] || '',
    });
  }
  localStorage.setItem('cuteKidsCart', JSON.stringify(cart));
  renderCart();
  showCartNotification();
  select.value = '';
}

function addToCartFromDetail() {
  if (!selectedSize) {
    alert(currentLang === 'ar' ? 'يرجى اختيار المقاس' : 'Please select a size');
    return;
  }
  const product = products.find(p => p.id === selectedProductId);
  if (!product) return;
  const variant = product.variants.find(v => v.size === selectedSize);
  if (!variant || variant.stock < selectedQty) {
    alert(currentLang === 'ar' ? 'الكمية غير متوفرة' : 'Quantity not available');
    return;
  }

  const existing = cart.find(item => item.productId === product.id && item.size === selectedSize);
  if (existing) {
    existing.quantity += selectedQty;
    if (existing.quantity > variant.stock) existing.quantity = variant.stock;
  } else {
    cart.push({
      productId: product.id,
      size: selectedSize,
      quantity: selectedQty,
      price: product.price,
      name_ar: product.name_ar,
      name_en: product.name_en,
      category: product.category,
      image: product.images?.[0] || '',
    });
  }
  localStorage.setItem('cuteKidsCart', JSON.stringify(cart));
  closeProductDetail();
  renderCart();
  showCartNotification();
}

// ===================== CART =====================
function renderCart() {
  const container = document.getElementById('cartContainer');
  const countEl = document.getElementById('cartCount');
  const totalEl = document.getElementById('cartTotal');
  if (!container) return;

  if (countEl) countEl.textContent = cart.reduce((s, i) => s + i.quantity, 0);

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-6xl mb-4">🛒</div>
        <p class="text-gray-500 text-lg font-medium" data-i18n="cartEmpty">${t('cartEmpty')}</p>
        <button onclick="closeCart()" class="mt-4 px-6 py-2.5 bg-[#1D355E] text-white rounded-xl hover:bg-[#2B4A7A] transition" data-i18n="startShopping">${t('startShopping')}</button>
      </div>
    `;
    if (totalEl) totalEl.textContent = '0 ' + t('egp');
    return;
  }

  container.innerHTML = cart.map((item, idx) => {
    const product = products.find(p => p.id === item.productId);
    const variant = product?.variants.find(v => v.size === item.size);
    const maxQty = variant ? variant.stock : item.quantity;
    return `
      <div class="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
        <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
          <img src="${item.image}" alt="${currentLang === 'ar' ? item.name_ar : item.name_en}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-sm text-[#1D355E] truncate">${currentLang === 'ar' ? item.name_ar : item.name_en}</h4>
          <div class="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span>${t('size')}: ${item.size}</span>
            <span>×</span>
            <span>${item.price} ${t('egp')}</span>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button onclick="changeCartQty(${idx}, -1)" class="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 transition">−</button>
            <span class="text-sm font-bold text-[#1D355E] w-6 text-center">${item.quantity}</span>
            <button onclick="changeCartQty(${idx}, 1)" class="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 transition" ${item.quantity >= maxQty ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="font-bold text-[#F3B423]">${item.price * item.quantity} ${t('egp')}</div>
          <button onclick="removeCartItem(${idx})" class="text-xs text-red-400 hover:text-red-600 mt-1 transition">${t('remove')}</button>
        </div>
      </div>
    `;
  }).join('');

  updateCartSummary();
}

function changeCartQty(idx, delta) {
  const item = cart[idx];
  if (!item) return;
  const product = products.find(p => p.id === item.productId);
  const variant = product?.variants.find(v => v.size === item.size);
  const maxQty = variant ? variant.stock : 99;
  item.quantity = Math.max(1, Math.min(maxQty, item.quantity + delta));
  localStorage.setItem('cuteKidsCart', JSON.stringify(cart));
  renderCart();
}

function removeCartItem(idx) {
  cart.splice(idx, 1);
  localStorage.setItem('cuteKidsCart', JSON.stringify(cart));
  renderCart();
  if (cart.length === 0) setAppliedCoupon(null);
}

function updateCartSummary() {
  const el = document.getElementById('cartSummary');
  const totalEl = document.getElementById('cartTotal');
  if (!el) return;

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const autoDiscounts = calculateAutoDiscounts(cart);
  let discountTotal = autoDiscounts.reduce((s, d) => s + d.discountAmount, 0);

  let couponDiscount = 0;
  let couponLabel = '';
  if (appliedCouponCode) {
    const coupon = coupons.find(c => c.code === appliedCouponCode && c.active !== false);
    if (coupon) {
      const result = calculateCouponDiscount(coupon, cart, subtotal - discountTotal);
      couponDiscount = result.amount;
      couponLabel = result.label;
    }
  }

  const totalDiscount = discountTotal + couponDiscount;
  const afterDiscount = subtotal - totalDiscount;

  el.innerHTML = `
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-600">${t('subTotal')}</span>
        <span class="font-semibold">${subtotal} ${t('egp')}</span>
      </div>
      ${autoDiscounts.map(d => `
        <div class="flex justify-between text-green-600">
          <span>${d.label}</span>
          <span>-${d.discountAmount} ${t('egp')}</span>
        </div>
      `).join('')}
      ${couponDiscount > 0 ? `
        <div class="flex justify-between text-green-600">
          <span>${couponLabel}</span>
          <span>-${couponDiscount} ${t('egp')}</span>
        </div>
      ` : ''}
      <div class="flex justify-between text-gray-600">
        <span>${t('shipping')}</span>
        <span>${afterDiscount >= CONFIG.freeShippingMin ? `<span class="text-green-600 font-semibold">${t('freeShipping')}</span>` : `${CONFIG.shippingCost} ${t('egp')}`}</span>
      </div>
      <hr class="my-2">
      <div class="flex justify-between text-lg font-bold text-[#1D355E]">
        <span>${t('total')}</span>
        <span>${afterDiscount + (afterDiscount >= CONFIG.freeShippingMin ? 0 : CONFIG.shippingCost)} ${t('egp')}</span>
      </div>
    </div>
  `;
  if (totalEl) totalEl.textContent = (afterDiscount + (afterDiscount >= CONFIG.freeShippingMin ? 0 : CONFIG.shippingCost)) + ' ' + t('egp');
}

function toggleCart() {
  const drawer = document.getElementById('cartDrawer');
  drawer.classList.toggle('translate-x-full');
  drawer.classList.toggle('translate-x-0');
  renderCart();
}

function closeCart() {
  document.getElementById('cartDrawer').classList.add('translate-x-full');
  document.getElementById('cartDrawer').classList.remove('translate-x-0');
}

// ===================== DISCOUNT ENGINE =====================
function calculateAutoDiscounts(cartItems) {
  const discounts = [];
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const lang = currentLang;

  for (const coupon of coupons) {
    if (!coupon.auto_apply || !coupon.active) continue;
    if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) continue;
    const cond = typeof coupon.conditions === 'string' ? JSON.parse(coupon.conditions) : (coupon.conditions || {});
    let applies = false;
    let matchedItems = [];
    let label = '';

    if (cond.minItems && totalItems >= cond.minItems) {
      applies = true;
      matchedItems = cartItems;
      label = lang === 'ar'
        ? `خصم ${coupon.value}${coupon.type === 'percentage' ? '%' : ' جنيه'} (${totalItems} قطع)`
        : `${coupon.type === 'percentage' ? coupon.value + '%' : coupon.value + ' EGP'} off (${totalItems} items)`;
    }

    if (cond.minAmount && subtotal >= cond.minAmount) {
      applies = true;
      matchedItems = cartItems;
      label = lang === 'ar'
        ? `خصم ${coupon.value}${coupon.type === 'percentage' ? '%' : ' جنيه'} (أكثر من ${cond.minAmount} جنيه)`
        : `${coupon.type === 'percentage' ? coupon.value + '%' : coupon.value + ' EGP'} off (over ${cond.minAmount} EGP)`;
    }

    if (cond.sizes && cond.sizes.length > 0) {
      const sizeItems = cartItems.filter(i => cond.sizes.includes(i.size));
      if (sizeItems.length > 0) {
        applies = true;
        matchedItems = sizeItems;
        const sizesLabel = cond.sizes.join(', ');
        label = lang === 'ar'
          ? `خصم ${coupon.value}${coupon.type === 'percentage' ? '%' : ' جنيه'} على مقاسات ${sizesLabel}`
          : `${coupon.type === 'percentage' ? coupon.value + '%' : coupon.value + ' EGP'} off on sizes ${sizesLabel}`;
      }
    } else if (cond.size) {
      const sizeItems = cartItems.filter(i => i.size === cond.size);
      if (sizeItems.length > 0) {
        applies = true;
        matchedItems = sizeItems;
        label = lang === 'ar'
          ? `خصم ${coupon.value}% على مقاس ${cond.size}`
          : `${coupon.value}% off on size ${cond.size}`;
      }
    }

    if (applies && matchedItems.length > 0) {
      let discountAmount = 0;
      if (coupon.type === 'percentage') {
        const affectedTotal = matchedItems.reduce((s, i) => s + i.price * i.quantity, 0);
        discountAmount = Math.round(affectedTotal * coupon.value / 100);
      } else {
        discountAmount = coupon.value;
      }
      discounts.push({ coupon, discountAmount, label });
    }
  }

  return discounts;
}

function calculateCouponDiscount(coupon, cartItems, currentTotal) {
  let amount = 0;
  let affectedItems = cartItems;
  let label = '';
  const cond = typeof coupon.conditions === 'string' ? JSON.parse(coupon.conditions) : (coupon.conditions || {});

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  if (cond.minItems && totalItems < cond.minItems) return { amount: 0, label: '' };
  if (cond.minAmount) {
    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    if (subtotal < cond.minAmount) return { amount: 0, label: '' };
  }
  if (cond.category) {
    // Support both slug and id for backward compatibility
    const catMatch = (i) => {
      if (i.category === cond.category) return true;
      if (typeof categories !== 'undefined') {
        const c = categories.find(c => String(c.id) === String(cond.category) || c.slug === cond.category);
        if (c && (i.category === c.slug || String(i.category) === String(c.id))) return true;
      }
      return false;
    };
    affectedItems = affectedItems.filter(catMatch);
    if (affectedItems.length === 0) return { amount: 0, label: '' };
  }
  if (cond.sizes && cond.sizes.length > 0) {
    affectedItems = affectedItems.filter(i => cond.sizes.includes(i.size));
    if (affectedItems.length === 0) return { amount: 0, label: '' };
  } else if (cond.size) {
    affectedItems = affectedItems.filter(i => i.size === cond.size);
    if (affectedItems.length === 0) return { amount: 0, label: '' };
  }

  if (coupon.type === 'percentage') {
    const affectedTotal = affectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    amount = Math.round(affectedTotal * coupon.value / 100);
    label = `${coupon.code}: ${coupon.value}%`;
  } else {
    amount = Math.min(coupon.value, currentTotal);
    label = `${coupon.code}: ${coupon.value} ${currentLang === 'ar' ? 'جنيه' : 'EGP'}`;
  }

  return { amount, label };
}


// ===================== OFFER COUNTDOWN BANNER =====================
function getActiveOffers() {
  return coupons.filter(c => c.auto_apply && c.active && c.show_countdown && c.expires_at && new Date(c.expires_at) > new Date());
}

function renderOfferBanner() {
  const container = document.getElementById('offerBanner');
  if (!container) return;
  const offers = getActiveOffers();
  if (offers.length === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    if (offerInterval) { clearInterval(offerInterval); offerInterval = null; }
    return;
  }
  container.classList.remove('hidden');
  const now = new Date();
  const lang = currentLang;
  const html = offers.map(o => {
    const diff = new Date(o.expires_at) - now;
    if (diff <= 0) return '';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const label = lang === 'ar' ? o.label_ar : o.label_en;
    const dLabel = lang === 'ar' ? 'يوم' : 'd';
    const hLabel = lang === 'ar' ? 'ساعة' : 'h';
    const mLabel = lang === 'ar' ? 'دقيقة' : 'm';
    const sLabel = lang === 'ar' ? 'ثانية' : 's';
    return `
      <div class="flex items-center justify-between gap-4 bg-gradient-to-l from-[#1D355E] to-[#2B4A7A] text-white px-5 py-3 rounded-2xl shadow-lg">
        <div class="flex items-center gap-3">
          <span class="text-2xl">⏳</span>
          <div>
            <p class="font-bold text-sm">${label}</p>
            <p class="text-xs text-blue-200">${lang === 'ar' ? 'عرض لفترة محدودة' : 'Limited time offer'}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 font-mono font-bold text-lg" dir="ltr">
          ${days > 0 ? `<span class="bg-white/15 px-2.5 py-1 rounded-lg text-center min-w-[3rem]"><span class="block text-xs font-normal opacity-75">${dLabel}</span><span>${String(days).padStart(2, '0')}</span></span>` : ''}
          <span class="bg-white/15 px-2.5 py-1 rounded-lg text-center min-w-[3rem]"><span class="block text-xs font-normal opacity-75">${hLabel}</span><span>${String(hours).padStart(2, '0')}</span></span>
          <span class="text-blue-300">:</span>
          <span class="bg-white/15 px-2.5 py-1 rounded-lg text-center min-w-[3rem]"><span class="block text-xs font-normal opacity-75">${mLabel}</span><span>${String(mins).padStart(2, '0')}</span></span>
          <span class="text-blue-300">:</span>
          <span class="bg-white/15 px-2.5 py-1 rounded-lg text-center min-w-[3rem]"><span class="block text-xs font-normal opacity-75">${sLabel}</span><span>${String(secs).padStart(2, '0')}</span></span>
        </div>
      </div>`;
  }).filter(Boolean).join('');
  container.innerHTML = html;
}

function startOfferBannerInterval() {
  if (offerInterval) clearInterval(offerInterval);
  renderOfferBanner();
  offerInterval = setInterval(renderOfferBanner, 1000);
}

function applyCouponCode() {
  const input = document.getElementById('couponInput');
  const code = input?.value.trim().toUpperCase();
  if (!code) return;

  const coupon = coupons.find(c => c.code?.toUpperCase() === code && c.active);
  if (!coupon) {
    alert(t('invalidCoupon'));
    return;
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const result = calculateCouponDiscount(coupon, cart, subtotal);
  if (result.amount <= 0) {
    alert(t('invalidCoupon'));
    return;
  }

  setAppliedCoupon(coupon.code);
  input.value = '';
  renderCart();
  alert(t('couponApplied') + '! ' + result.label);
}

// ===================== CHECKOUT =====================
function showCheckout() {
  if (cart.length === 0) return;
  closeCart();
  goToPage('/checkout');
}

function closeCheckout() {
  const modal = document.getElementById('checkoutModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  document.body.style.overflow = '';
}

function updateCheckoutSummary() {
  const el = document.getElementById('checkoutSummary');
  if (!el) return;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const autoDiscounts = calculateAutoDiscounts(cart);
  let discountTotal = autoDiscounts.reduce((s, d) => s + d.discountAmount, 0);

  let couponDiscount = 0;
  if (appliedCouponCode) {
    const coupon = coupons.find(c => c.code === appliedCouponCode && c.active !== false);

    if (coupon) {
      const result = calculateCouponDiscount(coupon, cart, subtotal - discountTotal);
      couponDiscount = result.amount;
    }
  }

  const totalDiscount = discountTotal + couponDiscount;
  const afterDiscount = subtotal - totalDiscount;
  const shipping = afterDiscount >= CONFIG.freeShippingMin ? 0 : CONFIG.shippingCost;
  const grandTotal = afterDiscount + shipping;

  el.innerHTML = `
    <div class="bg-gray-50 rounded-xl p-4">
      <h4 class="font-bold text-[#1D355E] mb-3">${t('orderSummary')}</h4>
      <div class="space-y-2 text-sm">
        ${cart.map(item => `
          <div class="flex justify-between items-center">
            <div>
              <span class="font-medium">${currentLang === 'ar' ? item.name_ar : item.name_en}</span>
              <span class="text-gray-400 text-xs"> ×${item.quantity} (${t('size')} ${item.size})</span>
            </div>
            <span class="font-semibold">${item.price * item.quantity} ${t('egp')}</span>
          </div>
        `).join('')}
        <hr class="my-2">
        <div class="flex justify-between">
          <span class="text-gray-600">${t('subTotal')}</span>
          <span>${subtotal} ${t('egp')}</span>
        </div>
        ${totalDiscount > 0 ? `
          <div class="flex justify-between text-green-600">
            <span>${t('discount')}</span>
            <span>-${totalDiscount} ${t('egp')}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-gray-600">
          <span>${t('shipping')}</span>
          <span>${shipping === 0 ? `<span class="text-green-600 font-semibold">${t('freeShipping')}</span>` : `${shipping} ${t('egp')}`}</span>
        </div>
        <hr class="my-2">
        <div class="flex justify-between text-lg font-bold text-[#1D355E]">
          <span>${t('total')}</span>
          <span>${grandTotal} ${t('egp')}</span>
        </div>
      </div>
    </div>
  `;
}

async function placeOrder() {
  const name = document.getElementById('checkoutName')?.value.trim();
  const phone = document.getElementById('checkoutPhone')?.value.trim();
  const address = document.getElementById('checkoutAddress')?.value.trim();
  const city = document.getElementById('checkoutCity')?.value.trim();
  const notes = document.getElementById('checkoutNotes')?.value.trim() || '';

  if (!name || !phone || !address || !city) {
    alert(currentLang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
    return;
  }

  if (!/^01[0-9]{9}$/.test(phone.replace(/\s/g, ''))) {
    alert(currentLang === 'ar' ? 'يرجى إدخال رقم هاتف مصري صحيح (11 رقم)' : 'Please enter a valid Egyptian phone number');
    return;
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const autoDiscounts = calculateAutoDiscounts(cart);
  let discountTotal = autoDiscounts.reduce((s, d) => s + d.discountAmount, 0);
  let couponDiscount = 0;
  if (appliedCouponCode) {
    const coupon = coupons.find(c => c.code === appliedCouponCode && !c.auto_apply);
    if (coupon) {
      const result = calculateCouponDiscount(coupon, cart, subtotal - discountTotal);
      couponDiscount = result.amount;
    }
  }
  const totalDiscount = discountTotal + couponDiscount;

  const items = cart.map(i => ({
    product_id: i.productId,
    size: i.size,
    quantity: i.quantity,
  }));

  try {
    const result = await createCheckoutOrder({
      p_items: items,
      p_shipping_name: name,
      p_shipping_phone: phone,
      p_shipping_city: city,
      p_shipping_address: address,
      p_notes: notes,
      p_coupon_code: appliedCouponCode,
      p_discount: totalDiscount,
    });

    const saved = {
      id: result.id,
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      customer_city: city,
      notes,
      items: cart.map(i => ({
        productId: i.productId,
        size: i.size,
        quantity: i.quantity,
        price: i.price,
        name_ar: i.name_ar,
        name_en: i.name_en,
        category: i.category,
        image: i.image,
      })),
      subtotal,
      discount: totalDiscount,
      total: result.total,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    orders.unshift(saved);
    cart = [];
    setAppliedCoupon(null);
    localStorage.setItem('cuteKidsCart', JSON.stringify(cart));
    closeCheckout();
    renderCart();
    localStorage.setItem('cuteKidsLastOrder', JSON.stringify(saved));
    goToPage('/thank-you');
  } catch (err) {
    const msg = err.message || err.toString();
    alert((currentLang === 'ar' ? 'حدث خطأ: ' : 'Error: ') + msg);
    console.error(err);
  }
}

function showOrderConfirmation(order) {
  const modal = document.getElementById('orderConfirmModal');
  const content = document.getElementById('orderConfirmContent');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="text-center">
      <div class="text-6xl mb-4">🎉</div>
      <h3 class="text-2xl font-bold text-[#1D355E] mb-2">${t('orderSuccess')}</h3>
      <p class="text-gray-500 mb-6">${t('orderPlaced')}</p>
      <div class="bg-gray-50 rounded-xl p-4 mb-6">
        <div class="flex justify-between mb-2">
          <span class="text-gray-500">${t('orderNumber')}</span>
          <span class="font-bold text-[#1D355E]">#${order.id}</span>
        </div>
        <div class="flex justify-between mb-2">
          <span class="text-gray-500">${t('orderDate')}</span>
          <span class="font-semibold">${new Date(order.created_at || order.date).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US')}</span>
        </div>
        <div class="flex justify-between mb-2">
          <span class="text-gray-500">${t('orderStatus')}</span>
          <span class="font-semibold text-[#F3B423]">${t('pending')}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">${t('total')}</span>
          <span class="font-bold text-[#1D355E] text-lg">${order.total} ${t('egp')}</span>
        </div>
      </div>
      <button onclick="closeOrderConfirmation()" class="px-8 py-3 bg-[#1D355E] text-white font-bold rounded-xl hover:bg-[#2B4A7A] transition">${t('continueShopping')}</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeOrderConfirmation() {
  document.getElementById('orderConfirmModal').classList.add('hidden');
  document.getElementById('orderConfirmModal').classList.remove('flex');
  document.body.style.overflow = '';
  renderProducts();
  renderFilters();
}

// ===================== NOTIFICATION =====================
function showCartNotification() {
  const notif = document.getElementById('cartNotification');
  if (!notif) return;
  const text = notif.querySelector('span');
  if (text) text.textContent = currentLang === 'en' ? '✓ Added to cart!' : '✓ أضيف إلى العربة';
  notif.classList.remove('translate-y-20', 'opacity-0');
  notif.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    notif.classList.add('translate-y-20', 'opacity-0');
    notif.classList.remove('translate-y-0', 'opacity-100');
  }, 2000);
}
