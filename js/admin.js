let currentAdminPage = 'dashboard';

async function checkAdminAccess() {
  // Wait a bit for supabase to initialize if needed
  await new Promise(r => setTimeout(r, 500));
  let session = await getSession();
  if (!session?.user) {
    window.location.href = 'index.html';
    return;
  }
  let profile = null;
  try {
    if (typeof supabase !== 'undefined' && supabase) {
      profile = await getProfile(session.user.id);
    }
  } catch (e) {
    // ignore
  }
  if (!profile) {
    if (session.user.email?.toLowerCase() === 'admin@gmail.com') {
      profile = { role: 'admin' };
    } else {
      window.location.href = 'index.html';
      return;
    }
  }
  if (!['admin', 'staff'].includes(profile?.role)) {
    if (session.user.email?.toLowerCase() === 'admin@gmail.com' && profile) {
      profile.role = 'admin';
    } else {
      window.location.href = 'index.html';
      return;
    }
  }
  currentUser = session.user;
  currentProfile = profile;
}

function toggleMobileAdminMenu() {
  document.getElementById('mobileAdminMenu').classList.toggle('hidden');
}

async function showAdminPage(page) {
  if (currentProfile?.role === 'staff' && page === 'dashboard') {
    page = 'products';
  }
  currentAdminPage = page;
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.classList.remove('bg-white/10');
    btn.classList.add('hover:bg-white/10');
  });

  const topBtns = document.querySelectorAll('#mobileTopNav button');
  const pageIdx = { dashboard: 0, products: 1, coupons: 2, categories: 3, orders: 4, popup: 5, hero: 6, fab: 7, staff: 8 }[page] || 0;
  topBtns.forEach((btn, i) => {
    btn.className = i === pageIdx
      ? 'px-3 py-1.5 bg-[#1D355E] text-white text-xs font-bold rounded-lg whitespace-nowrap'
      : 'px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg whitespace-nowrap';
  });

  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'products': renderAdminProducts(); break;
    case 'coupons': renderAdminCoupons(); break;
    case 'categories': renderAdminCategories(); break;
    case 'orders': renderAdminOrders(); break;
    case 'popup': await renderAdminPopup(); break;
    case 'hero': await renderAdminHero(); break;
    case 'fab': await renderAdminFab(); break;
    case 'staff': renderAdminStaff(); break;
  }
}

// ===================== DASHBOARD =====================
function renderDashboard() {
  const container = document.getElementById('adminContent');
  const totalProducts = products.length;
  const totalStock = products.reduce((s, p) => s + p.variants.reduce((s2, v) => s2 + v.stock, 0), 0);
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  container.innerHTML = `
    <h1 class="text-2xl font-extrabold text-[#1D355E] mb-6">📊 لوحة المعلومات</h1>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div class="text-3xl mb-2">👕</div>
        <div class="text-2xl font-extrabold text-[#1D355E]">${totalProducts}</div>
        <div class="text-sm text-gray-500">إجمالي المنتجات</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div class="text-3xl mb-2">📦</div>
        <div class="text-2xl font-extrabold text-[#1D355E]">${totalStock}</div>
        <div class="text-sm text-gray-500">إجمالي المخزون</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div class="text-3xl mb-2">📋</div>
        <div class="text-2xl font-extrabold text-[#1D355E]">${totalOrders}</div>
        <div class="text-sm text-gray-500">إجمالي الطلبات</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div class="text-3xl mb-2">💰</div>
        <div class="text-2xl font-extrabold text-[#1D355E]">${totalRevenue}</div>
        <div class="text-sm text-gray-500">إجمالي الإيرادات</div>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 class="font-bold text-[#1D355E] mb-4">🕐 طلبات معلقة (${pendingOrders})</h3>
        ${pendingOrders === 0 ? '<p class="text-gray-500 text-sm">لا توجد طلبات معلقة</p>' : orders.filter(o => o.status === 'pending').slice(0, 5).map(o => `
          <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <div>
              <span class="font-semibold text-sm">#${o.id}</span>
              <span class="text-xs text-gray-500 mr-2">${o.customer_name}</span>
            </div>
            <span class="text-sm font-bold text-[#F3B423]">${o.total} ج</span>
          </div>
        `).join('')}
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 class="font-bold text-[#1D355E] mb-4">⚠️ منتجات أوشكت على النفاد</h3>
        ${products.filter(p => p.variants.some(v => v.stock > 0 && v.stock <= 3)).slice(0, 5).map(p => {
          const low = p.variants.filter(v => v.stock > 0 && v.stock <= 3);
          return `<div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <div><span class="font-semibold text-sm">${p.name_ar}</span><span class="text-xs text-gray-500 mr-2">${low.map(v => v.size + '(' + v.stock + ')').join('، ')}</span></div>
            <span class="text-sm font-bold text-red-500">${low.reduce((s, v) => s + v.stock, 0)}</span>
          </div>`;
        }).join('') || '<p class="text-gray-500 text-sm">جميع المنتجات متوفرة</p>'}
      </div>
    </div>
  `;
}

// ===================== PRODUCTS MANAGEMENT =====================
function renderAdminProducts() {
  const container = document.getElementById('adminContent');
  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-extrabold text-[#1D355E]">👕 إدارة المنتجات</h1>
      <button onclick="openEditProduct(null)" class="px-4 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        إضافة منتج
      </button>
    </div>
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-600 text-xs font-semibold">
              <th class="text-right p-3">المنتج</th>
              <th class="text-right p-3">القسم</th>
              <th class="text-right p-3">السعر</th>
              <th class="text-right p-3">المخزون</th>
              <th class="text-right p-3">المقاسات</th>
              <th class="text-center p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => {
              const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
              const sizes = p.variants.map(v => `${v.size} (${v.stock})`).join('، ');
              const cat = categories.find(c => String(c.slug) === String(p.category));
              return `
                <tr class="border-t border-gray-50 hover:bg-gray-50/50">
                  <td class="p-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0"><img src="${p.images?.[0] || ''}" class="w-full h-full object-cover"></div>
                      <div>
                        <div class="font-semibold text-[#1D355E]">${p.name_ar}</div>
                        <div class="text-xs text-gray-400">${p.name_en}</div>
                      </div>
                    </div>
                  </td>
                  <td class="p-3 text-gray-600">${cat ? cat.name_ar : '-'}</td>
                  <td class="p-3 font-bold text-[#F3B423]">${p.price} ج</td>
                  <td class="p-3">
                    <span class="${totalStock === 0 ? 'text-red-500' : totalStock <= 10 ? 'text-[#F3B423]' : 'text-green-500'} font-semibold">${totalStock}</span>
                  </td>
                  <td class="p-3 text-xs text-gray-500 max-w-[200px] truncate" title="${sizes}">${sizes}</td>
                  <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button onclick="openEditProduct(${p.id})" class="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">تعديل</button>
                      <button onclick="adminDeleteProduct(${p.id})" class="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition">حذف</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openEditProduct(id) {
  const modal = document.getElementById('editProductModal');
  const title = document.getElementById('editProductTitle');
  const form = document.getElementById('editProductForm');
  const product = id ? products.find(p => p.id === id) : null;

  // Prepare warehouse data for the form
  let initSizes, initWarehouses;
  if (product && product.warehouses && product.warehouses.length > 0) {
    const raw = product.custom_sizes || product.customSizes || '';
    initSizes = typeof raw === 'string' ? raw.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(raw) ? raw : []);
    initWarehouses = JSON.parse(JSON.stringify(product.warehouses));
  } else if (product) {
    const variants = product.variants || product.product_variants || [];
    const rawSizes = product.custom_sizes || product.customSizes || '';
    initSizes = typeof rawSizes === 'string' ? rawSizes.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(rawSizes) ? rawSizes : variants.map(v => v.size));
    initWarehouses = [{ name: 'المخزن الرئيسي', items: variants.map(v => ({ size: v.size, stock: v.stock || 0 })) }];
  } else {
    initSizes = CONFIG.sizes;
    initWarehouses = [{ name: 'المخزن الرئيسي', items: [] }];
  }
  window._warehouseData = initWarehouses;

  title.textContent = product ? 'تعديل المنتج' : 'إضافة منتج جديد';
  form.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">الاسم (عربي)</label>
          <input id="ep_name_ar" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${product ? product.name_ar : ''}" placeholder="اسم المنتج بالعربية">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">الاسم (English)</label>
          <input id="ep_name_en" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${product ? product.name_en : ''}" placeholder="Product name in English">
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">القسم</label>
          <select id="ep_category" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
            ${categories.map(cat => `
              <option value="${cat.id}" ${product && (String(product.category_id) === String(cat.id)) ? 'selected' : ''}>${cat.name_ar}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">السعر (جنيه)</label>
          <input id="ep_price" type="number" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${product ? product.price : ''}" placeholder="السعر">
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">الوصف (عربي)</label>
        <textarea id="ep_desc_ar" rows="2" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" placeholder="وصف المنتج بالعربية">${product ? product.description_ar : ''}</textarea>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">الوصف (English)</label>
        <textarea id="ep_desc_en" rows="2" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" placeholder="Product description in English">${product ? product.description_en : ''}</textarea>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">الصورة الرئيسية</label>
        <div id="ep_main_image_container"></div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">معرض الصور</label>
        <div id="ep_gallery_container"></div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">المقاسات المخصصة (مفصولة بفواصل)</label>
        <input id="ep_custom_sizes" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${initSizes.join(', ')}" placeholder="مثال: 2, 3, 4, 5, 6, 7, 8, L, XL" oninput="renderWarehouseTable()">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">المستودعات</label>
        <div id="ep_warehouses_container"></div>
        <button onclick="addWarehouseRow()" type="button" class="mt-2 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition">+ إضافة مستودع فرعي</button>
      </div>
      <div class="flex gap-3 pt-2">
        <button onclick="saveProduct(${product ? product.id : 'null'})" class="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition">${product ? 'حفظ التغييرات' : 'إضافة المنتج'}</button>
        <button onclick="closeEditProduct()" class="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">إلغاء</button>
      </div>
    </div>
  `;
  renderWarehouseTable();
  // Init image uploaders
  window._productMainImage = product ? product.images?.[0] || '' : '';
  window._productGallery = product ? (product.images?.slice(1) || []) : [];
  const mainContainer = document.getElementById('ep_main_image_container');
  const galleryContainer = document.getElementById('ep_gallery_container');
  if (mainContainer) {
    mainContainer.innerHTML = '';
    createImageUploader(mainContainer, {
      currentUrl: window._productMainImage,
      prefix: 'product_' + (product?.id || 'new'),
      uploadLabel: 'اختيار الصورة الرئيسية',
      onUpload: (url) => { window._productMainImage = url; },
      onRemove: () => { window._productMainImage = ''; },
    });
  }
  if (galleryContainer) {
    galleryContainer.innerHTML = '';
    createGalleryUploader(galleryContainer, {
      images: window._productGallery,
      prefix: 'product_' + (product?.id || 'new') + '_gal',
      addLabel: '+ إضافة صورة للمعرض',
      onImagesChange: (urls) => { window._productGallery = urls; },
    });
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function renderWarehouseTable() {
  const container = document.getElementById('ep_warehouses_container');
  if (!container) return;
  const sizesStr = document.getElementById('ep_custom_sizes')?.value || '';
  const sizes = sizesStr.split(',').map(s => s.trim()).filter(Boolean);
  if (sizes.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400">أدخل المقاسات المخصصة أعلاه</p>';
    return;
  }
  if (!window._warehouseData || window._warehouseData.length === 0) {
    window._warehouseData = [{ name: 'المخزن الرئيسي', items: [] }];
  }
  // Sync DOM stock values into _warehouseData
  document.querySelectorAll('.wh-block').forEach((block, wi) => {
    if (wi >= window._warehouseData.length) return;
    const name = block.querySelector('.wh-name')?.value?.trim();
    if (name) window._warehouseData[wi].name = name;
    block.querySelectorAll('.wh-stock').forEach(inp => {
      const item = window._warehouseData[wi].items.find(i => i.size === inp.dataset.size);
      if (item) item.stock = parseInt(inp.value) || 0;
    });
  });
  // Rebuild with new sizes preserving stock
  const updated = window._warehouseData.map(wh => {
    const map = {};
    for (const item of wh.items) map[item.size] = item.stock;
    return { name: wh.name, items: sizes.map(s => ({ size: s, stock: map[s] || 0 })) };
  });
  window._warehouseData = updated;
  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th class="text-right p-2 text-xs font-semibold text-gray-600 border border-gray-100 min-w-[110px]">المستودع</th>
            ${sizes.map(s => `<th class="text-center p-2 text-xs font-semibold text-gray-600 border border-gray-100 min-w-[48px]">${s}</th>`).join('')}
            <th class="text-center p-2 w-8 border border-gray-100"></th>
          </tr>
        </thead>
        <tbody>
          ${updated.map((wh, wi) => `
            <tr class="wh-block border-t border-gray-50">
              <td class="p-1 border border-gray-50">
                <input class="wh-name w-full px-1.5 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#F3B423] outline-none" value="${wh.name}" ${wi === 0 ? 'readonly' : ''}>
                ${wi === 0 ? '<div class="text-[10px] text-gray-400 pr-1">رئيسي</div>' : ''}
              </td>
              ${wh.items.map(item => `
                <td class="p-1 border border-gray-50">
                  <input type="number" min="0" class="wh-stock w-full px-1 py-1 text-xs text-center border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#F3B423] outline-none" data-size="${item.size}" value="${item.stock}" placeholder="0">
                </td>
              `).join('')}
              <td class="p-1 border border-gray-50 text-center">
                ${wi > 0 ? `<button onclick="removeWarehouseRow(${wi})" class="text-red-400 hover:text-red-600 text-xs leading-none">✕</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
function addWarehouseRow() {
  if (!window._warehouseData || window._warehouseData.length === 0) return;
  const sizes = window._warehouseData[0].items.map(i => ({ size: i.size, stock: 0 }));
  window._warehouseData.push({ name: 'مستودع فرعي', items: sizes });
  renderWarehouseTable();
}
function removeWarehouseRow(idx) {
  if (idx === 0 || !window._warehouseData) return;
  window._warehouseData.splice(idx, 1);
  renderWarehouseTable();
}

function closeEditProduct() {
  document.getElementById('editProductModal').classList.add('hidden');
  document.getElementById('editProductModal').classList.remove('flex');
  document.body.style.overflow = '';
}

async function saveProduct(id) {
  const name_ar = document.getElementById('ep_name_ar')?.value.trim();
  const name_en = document.getElementById('ep_name_en')?.value.trim();
  const categoryId = document.getElementById('ep_category')?.value;
  const price = parseFloat(document.getElementById('ep_price')?.value);
  const desc_ar = document.getElementById('ep_desc_ar')?.value.trim() || '';
  const desc_en = document.getElementById('ep_desc_en')?.value.trim() || '';
  const mainImage = window._productMainImage || 'https://placehold.co/400x500/F3B423/1D355E?text=Product';
  const gallery = window._productGallery || [];
  const allImages = [mainImage, ...gallery];

  if (!name_ar || !name_en || !price) {
    alert('يرجى ملء الحقول المطلوبة');
    return;
  }

  const sizesStr = document.getElementById('ep_custom_sizes')?.value || '';
  const warehouses = [];
  document.querySelectorAll('.wh-block').forEach(block => {
    const name = block.querySelector('.wh-name')?.value?.trim() || 'مستودع';
    const items = [];
    block.querySelectorAll('.wh-stock').forEach(inp => items.push({ size: inp.dataset.size, stock: parseInt(inp.value) || 0 }));
    warehouses.push({ name, items });
  });

  try {
    const data = { category_id: categoryId, name_ar, name_en, description_ar: desc_ar, description_en: desc_en, price, images: allImages, custom_sizes: sizesStr, warehouses };
    if (id) {
      await updateProduct(id, data);
    } else {
      await createProduct(data);
    }
    await refreshProducts();
    closeEditProduct();
    renderAdminProducts();
  } catch (err) {
    alert('خطأ في حفظ المنتج: ' + err.message);
  }
}

async function adminDeleteProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  try {
    await window.deleteProduct(id);
    await refreshProducts();
    renderAdminProducts();
  } catch (err) {
    alert('خطأ في حذف المنتج: ' + err.message);
  }
}

// ===================== COUPONS MANAGEMENT =====================
function renderAdminCoupons() {
  const container = document.getElementById('adminContent');
  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-extrabold text-[#1D355E]">🏷️ إدارة الكوبونات والعروض</h1>
      <div class="flex items-center gap-2">
        <button onclick="openEditCoupon(null)" class="px-4 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          إضافة كوبون
        </button>
        <button onclick="openEditCoupon(null, true)" class="px-4 py-2.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          إضافة عرض تلقائي
        </button>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div class="p-4 bg-[#1D355E]/5 border-b border-gray-100">
        <h3 class="font-bold text-[#1D355E]">⚡ العروض التلقائية (بدون كود)</h3>
        <p class="text-xs text-gray-500 mt-1">هذه العروض تطبق تلقائياً عند استيفاء الشروط</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-600 text-xs font-semibold">
              <th class="text-right p-3">العرض</th>
              <th class="text-right p-3">النوع</th>
              <th class="text-right p-3">القيمة</th>
              <th class="text-right p-3">الشروط</th>
              <th class="text-right p-3">ينتهي</th>
              <th class="text-center p-3">حالة</th>
              <th class="text-center p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${coupons.filter(c => c.auto_apply).map(c => {
              const cond = typeof c.conditions === 'string' ? JSON.parse(c.conditions) : (c.conditions || {});
              return `
              <tr class="border-t border-gray-50 hover:bg-gray-50/50">
                <td class="p-3 font-semibold text-[#1D355E]">${currentLang === 'ar' ? c.label_ar : c.label_en}</td>
                <td class="p-3">${c.type === 'percentage' ? 'نسبة %' : 'قيمة ثابتة'}</td>
                <td class="p-3 font-bold text-[#F3B423]">${c.type === 'percentage' ? c.value + '%' : c.value + ' ج'}</td>
                <td class="p-3 text-xs text-gray-500">
                  ${[
                    cond.minItems ? `أقل ${cond.minItems} قطع` : '',
                    cond.minAmount ? `أقل ${cond.minAmount} ج` : '',
                    cond.category ? `قسم: ${categories.find(cat => cat.slug === cond.category)?.name_ar || cond.category}` : '',
                    (cond.sizes && cond.sizes.length > 0) ? `مقاسات: ${cond.sizes.join('، ')}` : (cond.size ? `مقاس: ${cond.size}` : ''),
                  ].filter(Boolean).join(', ') || 'بدون شروط'}
                </td>
                <td class="p-3 text-xs">${formatExpiryCell(c.expires_at)}</td>
                <td class="p-3 text-center">
                  <span class="px-2 py-0.5 ${c.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'} text-xs font-semibold rounded-full">${c.active ? 'مفعل' : 'معطل'}</span>
                </td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <button onclick="openEditCoupon(${c.id})" class="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">تعديل</button>
                    <button onclick="toggleCouponActive(${c.id})" class="px-3 py-1.5 text-xs font-semibold ${c.active ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'} rounded-lg hover:opacity-80 transition">${c.active ? 'تعطيل' : 'تفعيل'}</button>
                    <button onclick="deleteCoupon(${c.id})" class="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition">حذف</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-4 bg-[#1D355E]/5 border-b border-gray-100">
        <h3 class="font-bold text-[#1D355E]">🔑 كوبونات الخصم (بكود)</h3>
        <p class="text-xs text-gray-500 mt-1">يدخل العميل الكود عند الدفع للحصول على الخصم</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-600 text-xs font-semibold">
              <th class="text-right p-3">الكود</th>
              <th class="text-right p-3">النوع</th>
              <th class="text-right p-3">القيمة</th>
              <th class="text-right p-3">الشروط</th>
              <th class="text-center p-3">حالة</th>
              <th class="text-center p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${coupons.filter(c => !c.auto_apply).map(c => {
              const cond = typeof c.conditions === 'string' ? JSON.parse(c.conditions) : (c.conditions || {});
              return `
              <tr class="border-t border-gray-50 hover:bg-gray-50/50">
                <td class="p-3"><span class="font-mono font-bold text-[#1D355E] bg-gray-100 px-2 py-0.5 rounded">${c.code}</span></td>
                <td class="p-3">${c.type === 'percentage' ? 'نسبة %' : 'قيمة ثابتة'}</td>
                <td class="p-3 font-bold text-[#F3B423]">${c.type === 'percentage' ? c.value + '%' : c.value + ' ج'}</td>
                <td class="p-3 text-xs text-gray-500">
                  ${[
                    cond.minItems ? `أقل ${cond.minItems} قطع` : '',
                    cond.minAmount ? `أقل ${cond.minAmount} ج` : '',
                    cond.category ? `قسم: ${categories.find(cat => cat.slug === cond.category)?.name_ar || cond.category}` : '',
                    cond.size ? `مقاس: ${cond.size}` : '',
                  ].filter(Boolean).join(', ') || 'بدون شروط'}
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-0.5 ${c.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'} text-xs font-semibold rounded-full">${c.active ? 'مفعل' : 'معطل'}</span>
                </td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <button onclick="openEditCoupon(${c.id})" class="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">تعديل</button>
                    <button onclick="toggleCouponActive(${c.id})" class="px-3 py-1.5 text-xs font-semibold ${c.active ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'} rounded-lg hover:opacity-80 transition">${c.active ? 'تعطيل' : 'تفعيل'}</button>
                    <button onclick="deleteCoupon(${c.id})" class="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition">حذف</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getAllProductSizes() {
  const sizeSet = new Set();
  if (typeof products !== 'undefined' && products) {
    for (const p of products) {
      if (p.variants) for (const v of p.variants) sizeSet.add(v.size);
      if (p.product_variants) for (const v of p.product_variants) sizeSet.add(v.size);
    }
  }
  // fallback to CONFIG.sizes
  const configSizes = typeof CONFIG !== 'undefined' && CONFIG.sizes ? CONFIG.sizes : [];
  for (const s of configSizes) sizeSet.add(s);
  return [...sizeSet].sort((a, b) => {
    const an = Number(a), bn = Number(b);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    return a.localeCompare(b);
  });
}

function formatExpiryCell(expiresAt) {
  if (!expiresAt) return '<span class="text-gray-400">—</span>';
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return '<span class="text-red-500 font-semibold">منتهي</span>';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `<span class="text-gray-600">${days} يوم ${hours} س</span>`;
  return '<span class="text-[#F3B423] font-semibold">أقل من يوم</span>';
}

function openEditCoupon(id, isAuto) {
  const modal = document.getElementById('editCouponModal');
  const title = document.getElementById('editCouponTitle');
  const form = document.getElementById('editCouponForm');
  const coupon = id ? coupons.find(c => c.id === id) : null;
  const cond = coupon ? (typeof coupon.conditions === 'string' ? JSON.parse(coupon.conditions) : (coupon.conditions || {})) : {};
  const isAutoOffer = coupon ? coupon.auto_apply : !!isAuto;

  title.textContent = coupon ? 'تعديل الكوبون' : (isAutoOffer ? 'إضافة عرض تلقائي' : 'إضافة كوبون جديد');
  form.innerHTML = `
    <div class="space-y-4">
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input id="ec_auto_apply" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-[#F3B423] focus:ring-[#F3B423]" ${isAutoOffer ? 'checked' : ''}>
          <span class="text-sm font-semibold text-gray-700">عرض تلقائي (بدون كود)</span>
        </label>
      </div>
      <div id="ec_code_wrapper">
        <label class="block text-sm font-semibold text-gray-700 mb-1">كود الخصم</label>
        <input id="ec_code" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none font-mono font-bold uppercase" value="${coupon ? (isAutoOffer ? '' : coupon.code) : ''}" placeholder="مثال: SAVE20">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">نوع الخصم</label>
          <select id="ec_type" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
            <option value="percentage" ${coupon?.type === 'percentage' ? 'selected' : ''}>نسبة مئوية (%)</option>
            <option value="fixed" ${coupon?.type === 'fixed' ? 'selected' : ''}>قيمة ثابتة (جنيه)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">القيمة</label>
          <input id="ec_value" type="number" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${coupon ? coupon.value : ''}" placeholder="10">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">أقل عدد قطع</label>
          <input id="ec_minItems" type="number" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${cond.minItems || ''}" placeholder="بدون شرط">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">أقل مبلغ (جنيه)</label>
          <input id="ec_minAmount" type="number" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${cond.minAmount || ''}" placeholder="بدون شرط">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">قسم محدد</label>
          <select id="ec_category" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
            <option value="">كل الأقسام</option>
            ${categories.map(cat => `
              <option value="${cat.slug}" ${cond.category === cat.slug ? 'selected' : ''}>${cat.name_ar}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">المقاسات (اختيار متعدد)</label>
          <div id="ec_sizes" class="flex flex-wrap gap-2">
            ${getAllProductSizes().map(s => {
              const checked = (cond.sizes || (cond.size ? [cond.size] : [])).includes(s);
              return `<label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition ${checked ? 'bg-[#1D355E] text-white border-[#1D355E]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#F3B423]'}">
                <input type="checkbox" value="${s}" ${checked ? 'checked' : ''} class="hidden" onchange="this.parentElement.classList.toggle('bg-[#1D355E]');this.parentElement.classList.toggle('text-white');this.parentElement.classList.toggle('border-[#1D355E]');this.parentElement.classList.toggle('bg-white');this.parentElement.classList.toggle('text-gray-700');this.parentElement.classList.toggle('border-gray-200')">
                ${s}
              </label>`;
            }).join('')}
          </div>
          <p class="text-xs text-gray-400 mt-1">اختر مقاس واحد أو أكثر (اترك الكل بدون اختيار ليشمل كل المقاسات)</p>
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">العرض (ظاهر للعملاء)</label>
        <div class="grid grid-cols-2 gap-4">
          <input id="ec_label_ar" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${coupon ? coupon.label_ar : ''}" placeholder="وصف العرض بالعربية">
          <input id="ec_label_en" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${coupon ? coupon.label_en : ''}" placeholder="Offer description in English">
        </div>
      </div>
      <div id="ec_expiry_wrapper" class="${isAutoOffer ? '' : 'hidden'}">
        <label class="block text-sm font-semibold text-gray-700 mb-1">ينتهي في (تاريخ وساعة)</label>
        <input id="ec_expires_at" type="datetime-local" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${coupon && coupon.expires_at ? coupon.expires_at.slice(0, 16) : ''}">
        <p class="text-xs text-gray-400 mt-1">اتركه فارغاً إذا كان العرض بدون وقت انتهاء</p>
        <label class="flex items-center gap-2 cursor-pointer mt-2">
          <input id="ec_show_countdown" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-[#F3B423] focus:ring-[#F3B423]" ${coupon?.show_countdown ? 'checked' : ''}>
          <span class="text-sm text-gray-700">إظهار كعداد تنازلي في صفحة المنتجات</span>
        </label>
      </div>
      <div class="flex gap-3 pt-2">
        <button onclick="saveCoupon(${coupon ? coupon.id : 'null'})" class="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition">${coupon ? 'حفظ التغييرات' : 'إضافة الكوبون'}</button>
        <button onclick="closeEditCoupon()" class="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">إلغاء</button>
      </div>
    </div>
  `;
  // Toggle code field and expiry when auto_apply changes
  const autoCheck = document.getElementById('ec_auto_apply');
  const codeWrapper = document.getElementById('ec_code_wrapper');
  const expiryWrapper = document.getElementById('ec_expiry_wrapper');
  function toggleAutoFields() {
    if (codeWrapper) codeWrapper.style.display = autoCheck?.checked ? 'none' : 'block';
    if (expiryWrapper) expiryWrapper.style.display = autoCheck?.checked ? 'block' : 'none';
  }
  toggleAutoFields();
  if (autoCheck) autoCheck.addEventListener('change', toggleAutoFields);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeEditCoupon() {
  document.getElementById('editCouponModal').classList.add('hidden');
  document.getElementById('editCouponModal').classList.remove('flex');
  document.body.style.overflow = '';
}

async function saveCoupon(id) {
  const code = document.getElementById('ec_code')?.value.trim().toUpperCase();
  const type = document.getElementById('ec_type')?.value;
  const value = parseFloat(document.getElementById('ec_value')?.value);
  const minItems = parseInt(document.getElementById('ec_minItems')?.value) || null;
  const minAmount = parseFloat(document.getElementById('ec_minAmount')?.value) || null;
  const category = document.getElementById('ec_category')?.value || null;
  const sizeCheckboxes = document.querySelectorAll('#ec_sizes input[type="checkbox"]:checked');
  const sizes = sizeCheckboxes.length > 0 ? [...sizeCheckboxes].map(cb => cb.value) : null;
  const auto_apply = document.getElementById('ec_auto_apply')?.checked || false;
  const label_ar = document.getElementById('ec_label_ar')?.value.trim() || '';
  const label_en = document.getElementById('ec_label_en')?.value.trim() || '';
  const expiresAtRaw = document.getElementById('ec_expires_at')?.value || '';
  const expires_at = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;
  const show_countdown = document.getElementById('ec_show_countdown')?.checked || false;

  const codeVal = auto_apply ? 'أوتوماتيك' : code;
  if (!codeVal || !value) {
    alert('يرجى ملء الحقول المطلوبة');
    return;
  }

  const conditions = {};
  if (minItems) conditions.minItems = minItems;
  if (minAmount) conditions.minAmount = minAmount;
  if (category) conditions.category = category;
  if (sizes) conditions.sizes = sizes;

  try {
    if (id) {
      await updateCoupon(id, { code: codeVal, auto_apply, type, value, conditions, label_ar, label_en, expires_at, show_countdown });
    } else {
      await createCoupon({ code: codeVal, auto_apply, type, value, conditions, active: true, label_ar, label_en, used_count: 0, expires_at, show_countdown });
    }
    const newCoupons = await fetchCoupons();
    coupons = newCoupons || [];
    closeEditCoupon();
    renderAdminCoupons();
  } catch (err) {
    alert('خطأ في حفظ الكوبون: ' + err.message);
  }
}

async function toggleCouponActive(id) {
  const coupon = coupons.find(c => c.id === id);
  if (!coupon) return;
  try {
    await updateCoupon(id, { active: !coupon.active });
    coupon.active = !coupon.active;
    renderAdminCoupons();
  } catch (err) {
    alert('خطأ: ' + err.message);
  }
}

async function deleteCoupon(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
  try {
    await deleteCouponDb(id);
    coupons = coupons.filter(c => c.id !== id);
    renderAdminCoupons();
  } catch (err) {
    alert('خطأ في حذف الكوبون: ' + err.message);
  }
}

// ===================== CATEGORIES MANAGEMENT =====================
let editCategoryId = null;

function renderAdminCategories() {
  const container = document.getElementById('adminContent');
  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-extrabold text-[#1D355E]">إدارة التصنيفات</h1>
      <button onclick="openEditCategory(null)" class="px-4 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        إضافة تصنيف
      </button>
    </div>
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-600 text-xs font-semibold">
              <th class="text-right p-3">التصنيف</th>
              <th class="text-right p-3">الاسم (عربي)</th>
              <th class="text-right p-3">الاسم (English)</th>
              <th class="text-right p-3">التصنيف الأب</th>
              <th class="text-right p-3">الصورة</th>
              <th class="text-center p-3">إظهار</th>
              <th class="text-center p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${categories.filter(c => !c.parent_id).map(c => {
              const subs = categories.filter(s => String(s.parent_id) === String(c.id));
              const rowHtml = (cat, indent) => `
                <tr class="border-t border-gray-50 hover:bg-gray-50/50">
                  <td class="p-3">
                    <div class="flex items-center gap-3" style="padding-inline-start:${indent * 24}px">
                      <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 flex-shrink-0 ${cat.image ? '' : 'bg-gray-100'}">
                        ${cat.image ? `<img src="${cat.image}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs">${cat.name_ar.charAt(0)}</div>`}
                      </div>
                      <span class="font-semibold text-[#1D355E]">${cat.name_ar}</span>
                    </div>
                  </td>
                  <td class="p-3 text-gray-600">${cat.name_ar}</td>
                  <td class="p-3 text-gray-600">${cat.name_en || '-'}</td>
                  <td class="p-3 text-xs text-gray-400">${cat.parent_id ? (categories.find(p => String(p.id) === String(cat.parent_id))?.name_ar || '-') : '-'}</td>
                  <td class="p-3 text-xs text-gray-400 max-w-[120px] truncate" title="${cat.image || ''}">${cat.image ? 'نعم' : 'لا'}</td>
                  <td class="p-3 text-center">
                    <button onclick="toggleCategoryHidden('${cat.id}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition ${cat.hidden ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}">${cat.hidden ? 'مخفي' : 'ظاهر'}</button>
                  </td>
                  <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button onclick="openEditCategory('${cat.id}')" class="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">تعديل</button>
                      <button onclick="deleteCategory('${cat.id}')" class="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition">حذف</button>
                    </div>
                  </td>
                </tr>
              `;
              let html = rowHtml(c, 0);
              for (const sub of subs) html += rowHtml(sub, 1);
              return html;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openEditCategory(id) {
  editCategoryId = id;
  const cat = id ? categories.find(c => String(c.id) === String(id)) : null;
  const modal = document.getElementById('editCategoryModal');
  const title = document.getElementById('editCategoryTitle');
  const form = document.getElementById('editCategoryForm');
  title.textContent = cat ? 'تعديل التصنيف' : 'إضافة تصنيف جديد';
  form.innerHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">الاسم (عربي)</label>
        <input id="ec_name_ar" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${cat ? cat.name_ar : ''}" placeholder="اسم التصنيف بالعربية">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">الاسم (English)</label>
        <input id="ec_name_en" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${cat ? cat.name_en : ''}" placeholder="Category name in English">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">التصنيف الأب (اختياري)</label>
        <select id="ec_parent_id" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none bg-white">
          <option value="">— بدون —</option>
          ${categories.filter(c => !c.parent_id && (!cat || String(c.id) !== String(cat.id))).map(p => `
            <option value="${p.id}" ${cat && cat.parent_id && String(cat.parent_id) === String(p.id) ? 'selected' : ''}>${p.name_ar}</option>
          `).join('')}
        </select>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">صورة التصنيف</label>
        <div id="ec_image_container"></div>
      </div>
      <div class="flex gap-3 pt-2">
        <button onclick="saveCategory()" class="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition">${cat ? 'حفظ التغييرات' : 'إضافة التصنيف'}</button>
        <button onclick="closeEditCategory()" class="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">إلغاء</button>
      </div>
    </div>
  `;
  // Init image uploader
  window._categoryImage = cat ? cat.image || '' : '';
  const catImgContainer = document.getElementById('ec_image_container');
  if (catImgContainer) {
    catImgContainer.innerHTML = '';
    createImageUploader(catImgContainer, {
      currentUrl: window._categoryImage,
      prefix: 'category_' + (cat?.id || 'new'),
      uploadLabel: 'اختيار صورة التصنيف',
      onUpload: (url) => { window._categoryImage = url; },
      onRemove: () => { window._categoryImage = ''; },
    });
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeEditCategory() {
  document.getElementById('editCategoryModal').classList.add('hidden');
  document.getElementById('editCategoryModal').classList.remove('flex');
  document.body.style.overflow = '';
  editCategoryId = null;
}

async function saveCategory() {
  const name_ar = document.getElementById('ec_name_ar')?.value.trim();
  const name_en = document.getElementById('ec_name_en')?.value.trim();
  const image = window._categoryImage || '';
  const parent_id = document.getElementById('ec_parent_id')?.value || '';
  if (!name_ar) {
    alert('يرجى إدخال اسم التصنيف بالعربية');
    return;
  }
  try {
    if (editCategoryId) {
      await updateCategory(editCategoryId, { name_ar, name_en, image, parent_id: parent_id || null });
    } else {
      const slug = name_ar.replace(/[^\w\u0600-\u06FF]/g, '_').toLowerCase();
      await createCategory({ name_ar, name_en, image, slug, parent_id: parent_id || null });
    }
    await refreshCategories();
    closeEditCategory();
    renderAdminCategories();
  } catch (err) {
    alert('خطأ في حفظ التصنيف: ' + err.message);
  }
}

async function refreshCategories() {
  try {
    const catData = await fetchCategories();
    if (catData && catData.length > 0) {
      categories = catData;
    }
  } catch (e) {
    console.error('Failed to refresh categories:', e);
  }
}

async function toggleCategoryHidden(id) {
  const cat = categories.find(c => String(c.id) === String(id));
  if (!cat) return;
  const newHidden = !cat.hidden;
  try {
    await updateCategory(id, { hidden: newHidden });
    await refreshCategories();
    renderAdminCategories();
  } catch (err) {
    alert('خطأ في تغيير حالة التصنيف: ' + err.message);
  }
}

async function deleteCategory(id) {
  if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
  try {
    await deleteCategoryDb(id);
    await refreshCategories();
    renderAdminCategories();
  } catch (err) {
    alert('خطأ في حذف التصنيف: ' + err.message);
  }
}

// ===================== ORDERS MANAGEMENT =====================
function renderAdminOrders() {
  updatePendingBadges();
  const container = document.getElementById('adminContent');
  const statuses = ['pending', 'confirmed', 'shipped', 'delivered'];

  container.innerHTML = `
    <h1 class="text-2xl font-extrabold text-[#1D355E] mb-6">إدارة الطلبات</h1>
    ${orders.length === 0 ? `
      <div class="text-center py-16 bg-white rounded-2xl">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        <p class="text-gray-500 text-lg">لا توجد طلبات بعد</p>
      </div>
    ` : orders.slice().reverse().map(order => `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <span class="font-bold text-[#1D355E] text-lg">#${order.id}</span>
            <span class="text-xs text-gray-500 mr-2">${new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="openEditOrder(${order.id})" class="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">تعديل الطلب</button>
            <select onchange="adminUpdateOrderStatus(${order.id}, this.value)" class="px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F3B423] outline-none">
              ${statuses.map(s => `
                <option value="${s}" ${order.status === s ? 'selected' : ''}>${s === 'pending' ? 'قيد المراجعة' : s === 'confirmed' ? 'تم التأكيد' : s === 'shipped' ? 'تم الشحن' : 'تم التوصيل'}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-gray-500 text-xs">معلومات العميل</span>
            <p class="font-semibold">${order.customer_name}</p>
            <p class="text-gray-500">📞 ${order.customer_phone}</p>
            <p class="text-gray-500">📍 ${order.customer_city} - ${order.customer_address}</p>
            ${order.notes ? `<p class="text-gray-500">📝 ${order.notes}</p>` : ''}
          </div>
          <div>
            <span class="text-gray-500 text-xs">المنتجات</span>
            ${(order.items || []).map(item => `
              <div class="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <img src="${item.image || ''}" alt="${item.name_ar || item.name_en}" class="w-10 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-50" onerror="this.style.display='none'">
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-sm truncate">${item.name_ar || item.name_en}</div>
                  <div class="text-xs text-gray-500">مقاس ${item.size} ×${item.quantity}</div>
                </div>
                <span class="font-semibold text-sm whitespace-nowrap">${item.price * item.quantity} ج</span>
              </div>
            `).join('')}
          </div>
          <div>
            <span class="text-gray-500 text-xs">المحصل</span>
            <div class="text-lg font-extrabold text-[#1D355E]">${order.total} ج</div>
            <div class="text-xs text-gray-500">💰 الدفع عند الاستلام</div>
            ${order.coupon_code ? `<div class="text-xs text-green-600 mt-1">🏷️ كود: ${order.coupon_code}</div>` : ''}
            ${Number(order.discount) > 0 ? `<div class="text-xs text-green-600">خصم: ${order.discount} ج</div>` : ''}
            ${Number(order.shipping) > 0 ? `<div class="text-xs text-gray-500">شحن: ${order.shipping} ج</div>` : `<div class="text-xs text-green-600">توصيل مجاني</div>`}
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

async function adminUpdateOrderStatus(orderId, newStatus) {
  try {
    await window.updateOrderStatus(orderId, newStatus);
    const order = orders.find(o => o.id === orderId);
    if (order) order.status = newStatus;
    updatePendingBadges();
    renderAdminOrders();
  } catch (err) {
    alert('خطأ في تحديث حالة الطلب: ' + err.message);
  }
}

function updatePendingBadges() {
  const pending = orders.filter(o => o.status === 'pending').length;
  ['pendingBadgeDesktop', 'pendingBadgeMobile', 'pendingBadgeTopNav'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (pending > 0) {
        el.textContent = pending;
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
}

// ===================== ORDER EDITING =====================
function openEditOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  const modal = document.getElementById('editOrderModal') || createEditOrderModal();
  document.getElementById('editOrderId').value = order.id;
  document.getElementById('eo_customer_name').value = order.customer_name || '';
  document.getElementById('eo_customer_phone').value = order.customer_phone || '';
  document.getElementById('eo_customer_city').value = order.customer_city || '';
  document.getElementById('eo_customer_address').value = order.customer_address || '';
  document.getElementById('eo_notes').value = order.notes || '';
  const adminNotesEl = document.getElementById('eo_admin_notes');
  if (adminNotesEl) adminNotesEl.value = order.admin_notes || '';

  document.getElementById('eo_shipping').value = order.shipping || 0;
  document.getElementById('eo_coupon_code').value = order.coupon_code || '';
  document.getElementById('eo_discount').value = order.discount || 0;
  renderEditOrderItems(order.items || []);
  recalcOrderTotal();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function createEditOrderModal() {
  const div = document.createElement('div');
  div.id = 'editOrderModal';
  div.className = 'fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/50';
  div.onclick = function (e) { if (e.target === this) closeEditOrderModal(); };
  div.innerHTML = `
    <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative" onclick="event.stopPropagation()">
      <button onclick="closeEditOrderModal()" class="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-xl transition">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      <h2 class="text-xl font-bold text-[#1D355E] mb-6">تعديل الطلب #<span id="editOrderDisplayId"></span></h2>
      <input type="hidden" id="editOrderId">
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">الاسم</label>
            <input id="eo_customer_name" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">الهاتف</label>
            <input id="eo_customer_phone" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">المدينة</label>
            <input id="eo_customer_city" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">العنوان</label>
            <input id="eo_customer_address" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">📝 ملاحظة العميل</label>
            <textarea id="eo_notes" rows="2" class="w-full px-3 py-2.5 border border-yellow-200 bg-yellow-50 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" placeholder="ملاحظة كتبها العميل عند الطلب"></textarea>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">💬 ملاحظة الإدارة (تظهر للعميل)</label>
            <textarea id="eo_admin_notes" rows="2" class="w-full px-3 py-2.5 border border-blue-200 bg-blue-50 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" placeholder="مثال: يتم شحن الطلب غداً"></textarea>
          </div>
        </div>

        <hr>
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-[#1D355E]">المنتجات</h3>
          <button onclick="addEditOrderItem()" class="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition">+ إضافة منتج</button>
        </div>
        <div id="eo_items" class="space-y-2"></div>
        <hr>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">الشحن (ج)</label>
            <input id="eo_shipping" type="number" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" oninput="recalcOrderTotal()">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">الخصم (ج)</label>
            <input id="eo_discount" type="number" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" oninput="recalcOrderTotal()">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">كود الخصم</label>
            <input id="eo_coupon_code" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
          </div>
        </div>
        <div class="bg-gray-50 rounded-xl p-4">
          <div class="flex justify-between text-sm text-gray-600"><span>المجموع الفرعي</span><span id="eo_subtotal">0 ج</span></div>
          <div class="flex justify-between text-sm text-gray-600"><span>الشحن</span><span id="eo_shipping_display">0 ج</span></div>
          <div class="flex justify-between text-sm text-red-500"><span>الخصم</span><span id="eo_discount_display">0 ج</span></div>
          <div class="flex justify-between text-lg font-bold text-[#1D355E] mt-2 pt-2 border-t"><span>الإجمالي</span><span id="eo_total">0 ج</span></div>
        </div>
        <div class="flex gap-3 pt-2">
          <button onclick="saveOrderChanges()" class="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition">حفظ التعديلات</button>
          <button onclick="closeEditOrderModal()" class="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">إلغاء</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  return div;
}

function renderEditOrderItems(items) {
  const container = document.getElementById('eo_items');
  const orderId = Number(document.getElementById('editOrderId').value);
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">لا توجد منتجات</p>';
    document.getElementById('editOrderDisplayId').textContent = orderId;
    return;
  }
  container.innerHTML = items.map((item, idx) => `
    <div class="flex items-start gap-2 bg-gray-50 rounded-xl p-3 edit-order-item" data-index="${idx}">
      <img class="eo-item-thumb w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-white border border-gray-100" src="${item.image || ''}" alt="" onerror="this.style.visibility='hidden'">
      <div class="flex-1 min-w-0">
        <div class="mb-1">
          ${renderProductPicker(idx, item.productId, item.name_ar || item.name_en)}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <select onchange="updateEditItemSizes(this, ${idx})" class="eo-item-size px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-20 focus:ring-2 focus:ring-[#F3B423] outline-none">
            ${getEditItemSizes(item.productId, item.size)}
          </select>
          <input type="number" class="eo-item-qty px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-16 text-center focus:ring-2 focus:ring-[#F3B423] outline-none" value="${item.quantity}" min="1" onchange="recalcOrderTotal()">
          <input type="number" class="eo-item-price px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-24 text-center focus:ring-2 focus:ring-[#F3B423] outline-none" value="${item.price}" min="0" step="0.01" onchange="recalcOrderTotal()" oninput="recalcOrderTotal()">
          <span class="text-sm font-semibold text-[#1D355E] w-20 text-center eo-item-total">${(item.price * item.quantity).toFixed(0)} ج</span>
          <input type="hidden" class="eo-item-product-id" value="${item.productId || ''}">
          <input type="hidden" class="eo-item-image" value="${item.image || ''}">
          <input type="hidden" class="eo-item-category" value="${item.category || ''}">
          <input type="hidden" class="eo-item-name-ar" value="${(item.name_ar || '').replace(/"/g, '&quot;')}">
          <input type="hidden" class="eo-item-name-en" value="${(item.name_en || '').replace(/"/g, '&quot;')}">
          <button onclick="removeEditOrderItem(${idx})" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
  document.getElementById('editOrderDisplayId').textContent = orderId;
}

// Rich product picker with image thumbnails (searchable dropdown)
function renderProductPicker(idx, selectedProductId, selectedName) {
  const productsList = (typeof products !== 'undefined' ? products : []);
  const selected = productsList.find(p => String(p.id) === String(selectedProductId));
  const displayLabel = selected
    ? `${selected.name_ar || selected.name_en} — ${selected.price} ج (#${selected.id})`
    : (selectedName || 'اختر منتج');
  return `
    <div class="relative eo-picker" data-idx="${idx}">
      <button type="button" onclick="toggleProductPicker(${idx})" class="w-full flex items-center justify-between gap-2 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right bg-white hover:border-[#F3B423]">
        <span class="truncate">${displayLabel}</span>
        <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </button>
      <div class="eo-picker-menu hidden absolute z-30 mt-1 w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-hidden">
        <input type="text" oninput="filterProductPicker(${idx}, this.value)" placeholder="🔍 ابحث بالاسم أو الرقم..." class="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none">
        <div class="eo-picker-list overflow-y-auto max-h-60">
          ${productsList.map(p => `
            <div class="eo-picker-item flex items-center gap-2 px-2 py-2 hover:bg-[#F3B423]/10 cursor-pointer border-b border-gray-50 last:border-0" data-name="${(p.name_ar || '') + ' ' + (p.name_en || '') + ' ' + p.id}" onclick="selectProductInPicker(${idx}, ${p.id})">
              <img src="${p.images?.[0] || ''}" class="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" onerror="this.style.visibility='hidden'">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-[#1D355E] truncate">${p.name_ar || p.name_en}</div>
                <div class="text-xs text-gray-500">#${p.id} · ${p.price} ج</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function toggleProductPicker(idx) {
  document.querySelectorAll('.eo-picker-menu').forEach(m => {
    if (m.closest('.eo-picker')?.dataset.idx !== String(idx)) m.classList.add('hidden');
  });
  const picker = document.querySelector(`.eo-picker[data-idx="${idx}"] .eo-picker-menu`);
  picker?.classList.toggle('hidden');
}

function filterProductPicker(idx, q) {
  const list = document.querySelectorAll(`.eo-picker[data-idx="${idx}"] .eo-picker-item`);
  const lower = q.toLowerCase();
  list.forEach(el => {
    el.style.display = el.dataset.name.toLowerCase().includes(lower) ? '' : 'none';
  });
}

function selectProductInPicker(idx, productId) {
  const product = (typeof products !== 'undefined' ? products : []).find(p => String(p.id) === String(productId));
  if (!product) return;
  const row = document.querySelector(`.edit-order-item[data-index="${idx}"]`);
  if (!row) return;
  row.querySelector('.eo-item-product-id').value = productId;
  row.querySelector('.eo-item-image').value = product.images?.[0] || '';
  row.querySelector('.eo-item-category').value = product.category || '';
  row.querySelector('.eo-item-name-ar').value = product.name_ar || '';
  row.querySelector('.eo-item-name-en').value = product.name_en || '';
  row.querySelector('.eo-item-price').value = product.price;
  const thumb = row.querySelector('.eo-item-thumb');
  if (thumb) { thumb.src = product.images?.[0] || ''; thumb.style.visibility = 'visible'; }
  const btn = row.querySelector('.eo-picker button span');
  if (btn) btn.textContent = `${product.name_ar || product.name_en} — ${product.price} ج (#${product.id})`;
  const sizeSel = row.querySelector('.eo-item-size');
  if (sizeSel) sizeSel.innerHTML = getEditItemSizes(productId, '');
  document.querySelector(`.eo-picker[data-idx="${idx}"] .eo-picker-menu`)?.classList.add('hidden');
  recalcOrderTotal();
}

function addEditOrderItem() {
  const container = document.getElementById('eo_items');
  // Clear "no items" message if present
  if (container.querySelector('p')) container.innerHTML = '';
  const idx = container.querySelectorAll('.edit-order-item').length;
  const div = document.createElement('div');
  div.className = 'flex items-start gap-2 bg-gray-50 rounded-xl p-3 edit-order-item';
  div.dataset.index = idx;
  div.innerHTML = `
    <img class="eo-item-thumb w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-white border border-gray-100" src="" alt="" style="visibility:hidden">
    <div class="flex-1 min-w-0">
      <div class="mb-1">${renderProductPicker(idx, '', '')}</div>
      <div class="flex items-center gap-2 flex-wrap">
        <select class="eo-item-size px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-20 focus:ring-2 focus:ring-[#F3B423] outline-none">
          <option value="">—</option>
        </select>
        <input type="number" class="eo-item-qty px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-16 text-center focus:ring-2 focus:ring-[#F3B423] outline-none" value="1" min="1" onchange="recalcOrderTotal()">
        <input type="number" class="eo-item-price px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-24 text-center focus:ring-2 focus:ring-[#F3B423] outline-none" value="0" min="0" step="0.01" onchange="recalcOrderTotal()" oninput="recalcOrderTotal()">
        <span class="text-sm font-semibold text-[#1D355E] w-20 text-center eo-item-total">0 ج</span>
        <input type="hidden" class="eo-item-product-id" value="">
        <input type="hidden" class="eo-item-image" value="">
        <input type="hidden" class="eo-item-category" value="">
        <input type="hidden" class="eo-item-name-ar" value="">
        <input type="hidden" class="eo-item-name-en" value="">
        <button onclick="this.closest('.edit-order-item').remove(); recalcOrderTotal()" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    </div>
  `;
  container.appendChild(div);
}


function recalcOrderTotal() {
  const subtotal = [...document.querySelectorAll('.edit-order-item')].reduce((sum, row) => {
    const qty = parseFloat(row.querySelector('.eo-item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.eo-item-price')?.value) || 0;
    const total = qty * price;
    row.querySelector('.eo-item-total').textContent = total.toFixed(0);
    return sum + total;
  }, 0);
  const shipping = parseFloat(document.getElementById('eo_shipping')?.value) || 0;
  const discount = parseFloat(document.getElementById('eo_discount')?.value) || 0;
  const total = Math.max(0, subtotal + shipping - discount);
  document.getElementById('eo_subtotal').textContent = subtotal.toFixed(0) + ' ج';
  document.getElementById('eo_shipping_display').textContent = shipping.toFixed(0) + ' ج';
  document.getElementById('eo_discount_display').textContent = discount.toFixed(0) + ' ج';
  document.getElementById('eo_total').textContent = total.toFixed(0) + ' ج';
}

function removeEditOrderItem(idx) {
  const row = document.querySelector(`.edit-order-item[data-index="${idx}"]`);
  if (row) row.remove();
  recalcOrderTotal();
}

async function saveOrderChanges() {
  const orderId = Number(document.getElementById('editOrderId').value);
  const order = orders.find(o => o.id === orderId);
  const oldItems = order ? JSON.parse(JSON.stringify(order.items || [])) : [];

  const items = [...document.querySelectorAll('.edit-order-item')].map(row => {
    const productId = row.querySelector('.eo-item-product-id')?.value || '';
    const product = (typeof products !== 'undefined' ? products : []).find(pp => String(pp.id) === String(productId));
    const savedImage = row.querySelector('.eo-item-image')?.value || '';
    const savedCategory = row.querySelector('.eo-item-category')?.value || '';
    const savedNameAr = row.querySelector('.eo-item-name-ar')?.value || '';
    const savedNameEn = row.querySelector('.eo-item-name-en')?.value || '';
    return {
      productId: productId ? Number(productId) : null,
      size: row.querySelector('.eo-item-size')?.value || '',
      quantity: parseInt(row.querySelector('.eo-item-qty')?.value) || 1,
      price: parseFloat(row.querySelector('.eo-item-price')?.value) || 0,
      name_ar: product?.name_ar || savedNameAr,
      name_en: product?.name_en || savedNameEn,
      image: product?.images?.[0] || savedImage || '',
      category: product?.category || savedCategory || '',
    };
  }).filter(i => i.productId);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = parseFloat(document.getElementById('eo_shipping')?.value) || 0;
  const discount = parseFloat(document.getElementById('eo_discount')?.value) || 0;
  const total = Math.max(0, subtotal + shipping - discount);
  const couponCode = document.getElementById('eo_coupon_code')?.value.trim() || null;

  const updates = {
    customer_name: document.getElementById('eo_customer_name')?.value.trim() || '',
    customer_phone: document.getElementById('eo_customer_phone')?.value.trim() || '',
    customer_city: document.getElementById('eo_customer_city')?.value.trim() || '',
    customer_address: document.getElementById('eo_customer_address')?.value.trim() || '',
    notes: document.getElementById('eo_notes')?.value.trim() || '',
    admin_notes: document.getElementById('eo_admin_notes')?.value.trim() || '',
    items,
    subtotal,
    shipping,
    discount,
    total,
    coupon_code: couponCode,
    admin_modified: true,
    admin_modified_at: new Date().toISOString(),
  };

  try {
    // Adjust stock: compute per-(productId,size) diffs and apply
    await adjustStockForOrderEdit(oldItems, items);
    await window.updateOrder(orderId, updates);
    if (order) Object.assign(order, updates);
    closeEditOrderModal();
    renderAdminOrders();
  } catch (err) {
    alert('خطأ في حفظ التعديلات: ' + err.message);
  }
}

// Compute inventory delta between old and new items and apply via upsertVariant
async function adjustStockForOrderEdit(oldItems, newItems) {
  const map = new Map(); // key = productId|size, value = { productId, size, delta }
  // Old items: returning quantity to stock => +qty
  for (const it of oldItems) {
    if (!it.productId || !it.size) continue;
    const key = `${it.productId}|${it.size}`;
    const cur = map.get(key) || { productId: it.productId, size: it.size, delta: 0 };
    cur.delta += Number(it.quantity) || 0;
    map.set(key, cur);
  }
  // New items: consume from stock => -qty
  for (const it of newItems) {
    if (!it.productId || !it.size) continue;
    const key = `${it.productId}|${it.size}`;
    const cur = map.get(key) || { productId: it.productId, size: it.size, delta: 0 };
    cur.delta -= Number(it.quantity) || 0;
    map.set(key, cur);
  }
  // Apply deltas by updating stock on each variant
  const tasks = [];
  for (const { productId, size, delta } of map.values()) {
    if (delta === 0) continue;
    const product = (typeof products !== 'undefined' ? products : []).find(p => String(p.id) === String(productId));
    if (!product) continue;
    const variant = (product.variants || product.product_variants || []).find(v => String(v.size) === String(size));
    const currentStock = variant ? Number(variant.stock) || 0 : 0;
    const newStock = Math.max(0, currentStock + delta);
    if (variant && typeof window.updateVariant === 'function' && variant.id) {
      tasks.push(window.updateVariant(variant.id, newStock).then(() => { variant.stock = newStock; }));
    } else if (typeof window.upsertVariant === 'function') {
      tasks.push(window.upsertVariant(productId, size, newStock));
    }
  }
  await Promise.all(tasks);
}


function closeEditOrderModal() {
  const modal = document.getElementById('editOrderModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
}

// ===================== POPUP MANAGEMENT =====================
async function getPopupSettings() {
  const defaultSettings = { enabled: false, imageUrl: '', linkUrl: '', couponCode: 'WELCOME10', label: 'خصم 10% على أول طلب' };
  try {
    const supData = await fetchSetting('popup');
    if (supData) return { ...defaultSettings, ...supData };
  } catch {}
  return defaultSettings;
}

async function renderAdminPopup() {
  const container = document.getElementById('adminContent');
  const s = await getPopupSettings();
  container.innerHTML = `
    <h1 class="text-2xl font-extrabold text-[#1D355E] mb-6">الإعلان المنبثق (Popup)</h1>
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <label class="relative inline-flex items-center cursor-pointer">
            <input id="popup_enabled" type="checkbox" class="sr-only peer" ${s.enabled ? 'checked' : ''}>
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
          <span class="text-sm font-semibold text-gray-700">تفعيل الإعلان المنبثق</span>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">صورة الإعلان</label>
          <div id="popup_image_container"></div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">رابط الصورة (اختياري)</label>
          <input id="popup_link" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.linkUrl}" placeholder="https://example.com أو empty">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">كود الخصم</label>
          <input id="popup_coupon" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.couponCode}" placeholder="مثال: WELCOME10">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">النص</label>
          <input id="popup_label" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.label}" placeholder="مثال: خصم 10% على أول طلب">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">معاينة</label>
          <div id="popupPreview" class="border border-gray-200 rounded-2xl overflow-hidden max-w-sm mx-auto">
            ${s.imageUrl ? `<img src="${s.imageUrl}" class="w-full h-48 object-cover">` : '<div class="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">الصورة</div>'}
            <div class="p-4 text-center">
              <div class="text-xs text-gray-500 mb-2">${s.label || 'كود الخصم'}</div>
              <div class="inline-block bg-[#F3B423] text-[#1D355E] font-bold px-6 py-2 rounded-xl text-sm">${s.couponCode || 'CODE'}</div>
            </div>
          </div>
        </div>
        <button onclick="savePopupSettings()" class="px-6 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition">حفظ الإعدادات</button>
      </div>
    </div>
    <div class="mt-4 text-xs text-gray-400">المنبثق يظهر مرة واحدة لكل زائر عند أول دخول للموقع. يختفي بعد إغلاقه أو نسخ الكود.</div>
  `;
  // Init popup image uploader
  window._popupImage = s.imageUrl || '';
  const popupImgContainer = document.getElementById('popup_image_container');
  if (popupImgContainer) {
    popupImgContainer.innerHTML = '';
    createImageUploader(popupImgContainer, {
      currentUrl: window._popupImage,
      prefix: 'popup',
      uploadLabel: 'اختيار صورة الإعلان',
      onUpload: (url) => {
        window._popupImage = url;
        const preview = document.getElementById('popupPreview');
        if (preview) {
          const img = preview.querySelector('img') || document.createElement('img');
          img.src = url;
          img.className = 'w-full h-48 object-cover';
          preview.insertBefore(img, preview.firstChild);
        }
      },
      onRemove: () => {
        window._popupImage = '';
        const preview = document.getElementById('popupPreview');
        if (preview) {
          const img = preview.querySelector('img');
          if (img) img.remove();
        }
      },
    });
  }
}

async function savePopupSettings() {
  const s = {
    enabled: document.getElementById('popup_enabled')?.checked || false,
    imageUrl: window._popupImage || '',
    linkUrl: document.getElementById('popup_link')?.value.trim() || '',
    couponCode: document.getElementById('popup_coupon')?.value.trim() || '',
    label: document.getElementById('popup_label')?.value.trim() || '',
  };
  await upsertSetting('popup', s);
  alert('تم حفظ إعدادات الإعلان المنبثق');
  await renderAdminPopup();
}

// ===================== HERO SLIDER MANAGEMENT =====================
async function getHeroSlides() {
  try {
    const supData = await fetchSetting('hero_slides');
    if (supData && Array.isArray(supData)) return supData;
  } catch {}
  return [];
}

async function saveHeroSlides(slides) {
  await upsertSetting('hero_slides', slides);
}

async function renderAdminHero() {
  const slides = await getHeroSlides();
  const container = document.getElementById('adminContent');
  container.innerHTML = `
    <h1 class="text-2xl font-extrabold text-[#1D355E] mb-2">السلايدر الرئيسي</h1>
    <p class="text-sm text-gray-500 mb-4">عند إضافة صور، يتحول الهيرو بالكامل إلى سلايدر صور بدون نصوص أو أزرار</p>
    <div class="flex items-center gap-2 mb-6">
      <button onclick="openAddHeroSlide()" class="px-4 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition flex items-center gap-2 text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        إضافة صورة
      </button>
    </div>
    ${slides.length === 0 ? `
      <div class="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <p class="text-gray-500 text-lg mb-2">لا توجد صور</p>
        <p class="text-gray-400 text-sm">أضف صوراً للسلايدر الرئيسي</p>
      </div>
    ` : `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${slides.map((slide, i) => `
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="aspect-[16/9] bg-gray-100 relative">
              <img src="${slide.image}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<div class=\\"w-full h-full flex items-center justify-center text-gray-400 text-sm\\">✕</div>'">
              ${slide.link ? `<div class="absolute top-2 left-2 bg-[#1D355E]/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">🔗</div>` : ''}
            </div>
            <div class="p-3">
              <div class="text-xs text-gray-500 truncate mb-2 dir-ltr text-left">
                ${slide.link ? `<span class="font-semibold">${slide.link}</span>` : '<span class="text-gray-400">بدون رابط</span>'}
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-1">
                  ${i > 0 ? `<button onclick="moveHeroSlide(${i}, -1)" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition" title="تحريك لأعلى">↑</button>` : ''}
                  ${i < slides.length - 1 ? `<button onclick="moveHeroSlide(${i}, 1)" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition" title="تحريك لأسفل">↓</button>` : ''}
                </div>
                <div class="flex gap-1">
                  <button onclick="openEditHeroSlide(${i})" class="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">تعديل</button>
                  <button onclick="deleteHeroSlide(${i})" class="px-2 py-1 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition">حذف</button>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function openAddHeroSlide() {
  const container = document.getElementById('adminContent');
  const modal = document.createElement('div');
  modal.id = 'heroSlideModal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50';
  modal.onclick = function(e) { if (e.target === this) closeHeroSlideModal(); };
  modal.innerHTML = `
    <div class="bg-white rounded-2xl w-full max-w-md p-6 relative">
      <button onclick="closeHeroSlideModal()" class="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-xl transition">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      <h2 class="text-xl font-bold text-[#1D355E] mb-6">إضافة صورة للسلايدر</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">صورة السلايدر</label>
          <div id="hs_image_container"></div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">الرابط (اختياري) — عند الضغط على الصورة</label>
          <input id="hs_link" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" placeholder="https://example.com">
        </div>
        <div class="flex gap-2 pt-2">
          <button onclick="saveHeroSlide(null)" class="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition">حفظ</button>
          <button onclick="closeHeroSlideModal()" class="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">إلغاء</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(modal);
  // Init hero image uploader
  window._heroImage = '';
  const hsContainer = document.getElementById('hs_image_container');
  if (hsContainer) {
    hsContainer.innerHTML = '';
    createImageUploader(hsContainer, {
      currentUrl: '',
      prefix: 'hero_' + Date.now(),
      uploadLabel: 'اختيار صورة السلايدر',
      onUpload: (url) => { window._heroImage = url; },
      onRemove: () => { window._heroImage = ''; },
    });
  }
}

let heroEditIndex = null;

async function openEditHeroSlide(index) {
  const slides = await getHeroSlides();
  const slide = slides[index];
  if (!slide) return;
  heroEditIndex = index;
  const container = document.getElementById('adminContent');
  const modal = document.createElement('div');
  modal.id = 'heroSlideModal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50';
  modal.onclick = function(e) { if (e.target === this) closeHeroSlideModal(); };
  modal.innerHTML = `
    <div class="bg-white rounded-2xl w-full max-w-md p-6 relative">
      <button onclick="closeHeroSlideModal()" class="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-xl transition">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      <h2 class="text-xl font-bold text-[#1D355E] mb-6">تعديل الصورة</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">صورة السلايدر</label>
          <div id="hs_image_container"></div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">الرابط (اختياري)</label>
          <input id="hs_link" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${slide.link || ''}">
        </div>
        <div class="flex gap-2 pt-2">
          <button onclick="saveHeroSlide(${index})" class="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition">حفظ التغييرات</button>
          <button onclick="closeHeroSlideModal()" class="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">إلغاء</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(modal);
  // Init hero image uploader
  window._heroImage = slide.image || '';
  const hsContainer = document.getElementById('hs_image_container');
  if (hsContainer) {
    hsContainer.innerHTML = '';
    createImageUploader(hsContainer, {
      currentUrl: window._heroImage,
      prefix: 'hero_' + Date.now(),
      uploadLabel: 'اختيار صورة السلايدر',
      onUpload: (url) => { window._heroImage = url; },
      onRemove: () => { window._heroImage = ''; },
    });
  }
}

function closeHeroSlideModal() {
  const modal = document.getElementById('heroSlideModal');
  if (modal) modal.remove();
  heroEditIndex = null;
}

async function saveHeroSlide(index) {
  const image = window._heroImage || '';
  const link = document.getElementById('hs_link')?.value.trim() || '';
  if (!image) { alert('يرجى اختيار صورة للسلايدر'); return; }
  let slides = await getHeroSlides();
  const slide = { image, link };
  if (index !== null && index !== undefined && index >= 0 && index < slides.length) {
    slides[index] = slide;
  } else {
    slides.push(slide);
  }
  await saveHeroSlides(slides);
  closeHeroSlideModal();
  await renderAdminHero();
}

async function deleteHeroSlide(index) {
  let slides = await getHeroSlides();
  if (index < 0 || index >= slides.length) return;
  slides.splice(index, 1);
  await saveHeroSlides(slides);
  await renderAdminHero();
}

async function moveHeroSlide(index, direction) {
  let slides = await getHeroSlides();
  const target = index + direction;
  if (target < 0 || target >= slides.length) return;
  [slides[index], slides[target]] = [slides[target], slides[index]];
  await saveHeroSlides(slides);
  await renderAdminHero();
}

// ===================== FAB (FLOATING CONTACT BUTTON) MANAGEMENT =====================
async function getFabSettings() {
  const defaults = { whatsapp: '01098286085', sales: '01061212626', complaints: '01012221197', whatsapp_label: 'واتساب', sales_label: 'واتس المبيعات', complaints_label: 'الشكاوي والمقترحات' };
  try {
    const supData = await fetchSetting('fab');
    if (supData) return { ...defaults, ...supData };
  } catch {}
  return defaults;
}

async function renderAdminFab() {
  const container = document.getElementById('adminContent');
  const s = await getFabSettings();
  container.innerHTML = `
    <h1 class="text-2xl font-extrabold text-[#1D355E] mb-6">📞 زر الاتصال العائم</h1>
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">اسم الزر (واتساب)</label>
            <input id="fab_whatsapp_label" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.whatsapp_label}" placeholder="مثال: واتساب">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">الرقم</label>
            <input id="fab_whatsapp" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.whatsapp}" placeholder="مثال: 01098286085" dir="ltr">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">اسم الزر (المبيعات)</label>
            <input id="fab_sales_label" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.sales_label}" placeholder="مثال: واتس المبيعات">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">الرقم</label>
            <input id="fab_sales" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.sales}" placeholder="مثال: 01061212626" dir="ltr">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">اسم الزر (الشكاوي)</label>
            <input id="fab_complaints_label" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.complaints_label}" placeholder="مثال: الشكاوي والمقترحات">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">الرقم</label>
            <input id="fab_complaints" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none" value="${s.complaints}" placeholder="مثال: 01012221197" dir="ltr">
          </div>
        </div>
        <div class="pt-4 border-t border-gray-100">
          <div class="text-sm font-semibold text-gray-700 mb-3">معاينة</div>
          <div class="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <div class="flex flex-col gap-2 max-w-[260px]">
              <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                <div class="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px]">💬</div>
                <div class="text-xs font-semibold text-[#1D355E]">${s.whatsapp_label} <span class="text-gray-400 font-normal">${s.whatsapp}</span></div>
              </div>
              <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                <div class="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px]">🛒</div>
                <div class="text-xs font-semibold text-[#1D355E]">${s.sales_label} <span class="text-gray-400 font-normal">${s.sales}</span></div>
              </div>
              <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                <div class="w-7 h-7 rounded-full bg-[#1D355E] flex items-center justify-center text-white text-[10px]">📞</div>
                <div class="text-xs font-semibold text-[#1D355E]">${s.complaints_label} <span class="text-gray-400 font-normal">${s.complaints}</span></div>
              </div>
            </div>
          </div>
        </div>
        <button onclick="saveFabSettings()" class="px-6 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition">حفظ الإعدادات</button>
      </div>
    </div>
  `;
}

async function saveFabSettings() {
  const s = {
    whatsapp: document.getElementById('fab_whatsapp')?.value.trim() || '',
    sales: document.getElementById('fab_sales')?.value.trim() || '',
    complaints: document.getElementById('fab_complaints')?.value.trim() || '',
    whatsapp_label: document.getElementById('fab_whatsapp_label')?.value.trim() || '',
    sales_label: document.getElementById('fab_sales_label')?.value.trim() || '',
    complaints_label: document.getElementById('fab_complaints_label')?.value.trim() || '',
  };
  await upsertSetting('fab', s);
  alert('تم حفظ إعدادات زر الاتصال');
  await renderAdminFab();
}

// ===================== STAFF MANAGEMENT =====================
function showStaffNavButtons(show) {
  document.getElementById('staffNavBtn')?.classList.toggle('hidden', !show);
  document.getElementById('staffNavBtnMobile')?.classList.toggle('hidden', !show);
  document.getElementById('staffNavBtnTop')?.classList.toggle('hidden', !show);
}

async function renderAdminStaff() {
  const container = document.getElementById('adminContent');
    container.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-[#1D355E]">إدارة الموظفين</h2>
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <h3 class="text-lg font-bold text-[#1D355E] mb-4">إنشاء حساب موظف جديد</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input id="staffName" type="text" placeholder="الاسم الكامل" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] focus:border-transparent outline-none">
          <input id="staffEmail" type="email" placeholder="البريد الإلكتروني" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] focus:border-transparent outline-none">
          <input id="staffPassword" type="password" placeholder="كلمة المرور" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] focus:border-transparent outline-none">
        </div>
        <button onclick="handleCreateStaff()" class="bg-[#1D355E] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D355E]/90 transition">
          إنشاء الحساب
        </button>
        <div id="createStaffStatus" class="mt-2 text-sm hidden"></div>
      </div>

      <div id="staffList" class="space-y-3">
        <div class="text-center py-8 text-gray-500">جاري التحميل...</div>
      </div>
    </div>
  `;

  try {
    const profiles = await fetchProfiles();
    const list = document.getElementById('staffList');

    if (!profiles || profiles.length === 0) {
      list.innerHTML = '<div class="text-center py-8 text-gray-500">لا يوجد موظفين</div>';
      return;
    }

    list.innerHTML = profiles.map(p => {
      const isAdmin = p.role === 'admin';
      const isStaff = p.role === 'staff';
      const isUser = p.role === 'user';
      const bgColor = isAdmin ? 'bg-[#1D355E]' : isStaff ? 'bg-[#F3B423]' : 'bg-gray-400';
      const roleText = isAdmin ? 'مدير' : isStaff ? 'موظف' : 'مستخدم';
      return `
        <div class="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${bgColor}">${(p.full_name || '?')[0]}</div>
            <div>
              <div class="font-semibold text-gray-800">${p.full_name || '—'}</div>
              <div class="text-xs text-gray-500">${roleText}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${isAdmin ? '<span class="text-xs bg-[#1D355E]/10 text-[#1D355E] px-3 py-1 rounded-full font-semibold">لا يمكن حذف المدير</span>' :
             isStaff ? `<button onclick="confirmDeleteStaff('${p.id}')" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-semibold">حذف</button>` :
             `<button onclick="promoteToStaff('${p.id}')" class="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition font-semibold">ترقية إلى موظف</button>`}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('Failed to load staff:', e);
    document.getElementById('staffList').innerHTML = '<div class="text-center py-8 text-red-500">فشل تحميل بيانات الموظفين</div>';
  }
}

window.handleCreateStaff = async function() {
  const name = document.getElementById('staffName')?.value.trim();
  const email = document.getElementById('staffEmail')?.value.trim();
  const password = document.getElementById('staffPassword')?.value.trim();
  const statusEl = document.getElementById('createStaffStatus');

  if (!name || !email || !password) {
    statusEl.textContent = 'يرجى ملء جميع الحقول';
    statusEl.className = 'mt-2 text-sm text-red-500';
    return;
  }
  if (password.length < 6) {
    statusEl.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    statusEl.className = 'mt-2 text-sm text-red-500';
    return;
  }

  statusEl.textContent = 'جاري إنشاء الحساب...';
  statusEl.className = 'mt-2 text-sm text-blue-500';

  try {
    await createStaffAccount(email, password, name);
    statusEl.textContent = 'تم إنشاء حساب الموظف بنجاح!';
    statusEl.className = 'mt-2 text-sm text-green-600';
    document.getElementById('staffName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffPassword').value = '';
    renderAdminStaff();
  } catch (e) {
    statusEl.textContent = e.message;
    statusEl.className = 'mt-2 text-sm text-red-500';
  }
};

window.confirmDeleteStaff = async function(userId) {
  if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
  try {
    const resp = await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'user' }),
      headers: { 'Prefer': 'return=representation' },
    });
    if (!resp.ok) throw new Error('فشل الحذف');
    renderAdminStaff();
    alert('تم حذف الموظف بنجاح');
  } catch (e) {
    alert('فشل حذف الموظف: ' + e.message);
  }
};

window.promoteToStaff = async function(userId) {
  if (!confirm('هل أنت متأكد من ترقية هذا المستخدم إلى موظف؟')) return;
  try {
    const resp = await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'staff' }),
      headers: { 'Prefer': 'return=representation' },
    });
    if (!resp.ok) throw new Error('فشل الترقية');
    renderAdminStaff();
    alert('تمت الترقية بنجاح');
  } catch (e) {
    alert('فشل الترقية: ' + e.message);
  }
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await checkAdminAccess();
    await initStore();
    try {
      orders = await fetchOrders();
    } catch (e) {
      console.warn('Failed to fetch orders:', e.message);
    }
    updatePendingBadges();
    if (currentProfile?.role === 'admin') {
      showStaffNavButtons(true);
    }
    renderDashboard();
  } catch (err) {
    console.error('Admin init failed:', err);
    const container = document.getElementById('adminContent');
    if (container) {
      container.innerHTML = `<div class="text-center py-16"><p class="text-red-500 text-lg">حدث خطأ في تحميل البيانات. تأكد من تشغيل خادم Supabase أو استخدم البيانات المحلية.</p></div>`;
    }
  }
});
