const SUPABASE_URL = 'https://nbqkgekosqyupfvpruao.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icWtnZWtvc3F5dXBmdnBydWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzI2MTUsImV4cCI6MjA5NjE0ODYxNX0.-kezapbD15fjxCgsHeFS_8q4lZUAA94toDlczqjXDXA';

let sessionCache = null;

async function supabaseFetch(path, opts = {}) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...opts.headers,
  };
  if (sessionCache?.access_token) {
    headers['Authorization'] = `Bearer ${sessionCache.access_token}`;
  }
  if (opts.method === 'GET' && opts.count) {
    headers['Prefer'] = 'count=exact';
  }
  const resp = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers });
  if (!resp.ok) {
    const text = await resp.text();
    let msg;
    try { const j = JSON.parse(text); msg = j.msg || j.error_description || j.message || text; } catch { msg = text; }
    throw new Error(msg);
  }
  return resp;
}

// ===================== AUTH =====================
async function signUp(email, password, fullName, phone) {
  const resp = await supabaseFetch('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, data: { full_name: fullName, phone } }),
  });
  const data = await resp.json();
  if (data.access_token) {
    sessionCache = data;
    const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    localStorage.setItem('cuteKidsSession', JSON.stringify({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: expiresAt }));
  }
  return data;
}

async function signIn(email, password) {
  // Clear session cache to avoid stale Authorization header
  const prevToken = sessionCache?.access_token;
  sessionCache = null;
  const resp = await supabaseFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await resp.json();
  sessionCache = data;
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  localStorage.setItem('cuteKidsSession', JSON.stringify({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: expiresAt }));
  return { user: data.user, session: { access_token: data.access_token, user: data.user } };
}

async function signOut() {
  const token = sessionCache?.access_token || JSON.parse(localStorage.getItem('cuteKidsSession') || '{}').access_token;
  if (token) {
    try {
      await supabaseFetch('/auth/v1/logout', { method: 'POST' });
    } catch {}
  }
  sessionCache = null;
  localStorage.removeItem('cuteKidsSession');
}

async function getSession() {
  if (sessionCache?.access_token) {
    try {
      const resp = await supabaseFetch('/auth/v1/user', { headers: { 'Authorization': `Bearer ${sessionCache.access_token}` } });
      if (resp.ok) {
        const user = await resp.json();
        return { user, access_token: sessionCache.access_token };
      }
    } catch {}
  }
  const saved = localStorage.getItem('cuteKidsSession');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.expires_at && parsed.expires_at > Date.now()) {
        sessionCache = parsed;
        const resp = await supabaseFetch('/auth/v1/user', { headers: { 'Authorization': `Bearer ${parsed.access_token}` } });
        if (resp.ok) {
          const user = await resp.json();
          return { user, access_token: parsed.access_token };
        }
        if (parsed.refresh_token) {
          const refreshResp = await supabaseFetch('/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: parsed.refresh_token }),
          });
          const refreshData = await refreshResp.json();
          sessionCache = refreshData;
          const expiresAt = Date.now() + (refreshData.expires_in || 3600) * 1000;
          localStorage.setItem('cuteKidsSession', JSON.stringify({ access_token: refreshData.access_token, refresh_token: refreshData.refresh_token, expires_at: expiresAt }));
          return { user: refreshData.user, access_token: refreshData.access_token };
        }
      }
    } catch {}
  }
  return null;
}

async function getProfile(userId) {
  try {
    const resp = await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}&select=*`, { method: 'GET' });
    const profiles = await resp.json();
    return profiles?.[0] || null;
  } catch { return null; }
}

// ===================== SETTINGS =====================
async function fetchSetting(key) {
  try {
    const resp = await supabaseFetch(`/rest/v1/settings?key=eq.${key}&select=value`, { method: 'GET' });
    const data = await resp.json();
    return data?.[0]?.value || null;
  } catch { return null; }
}

async function upsertSetting(key, value) {
  const resp = await supabaseFetch('/rest/v1/settings', {
    method: 'POST',
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    headers: { 'Prefer': 'resolution=merge-duplicates' },
  });
  return value;
}

// ===================== PRODUCTS =====================
async function fetchProducts() {
  const resp = await supabaseFetch('/rest/v1/products?select=*,product_variants(*)&order=created_at.desc', { method: 'GET' });
  return resp.json();
}

async function fetchProduct(id) {
  const resp = await supabaseFetch(`/rest/v1/products?id=eq.${id}&select=*,product_variants(*)`, { method: 'GET' });
  const data = await resp.json();
  return data?.[0] || null;
}

async function createProduct(product) {
  const resp = await supabaseFetch('/rest/v1/products', {
    method: 'POST',
    body: JSON.stringify({
      category_id: product.category_id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      description_ar: product.description_ar,
      description_en: product.description_en,
      price: product.price,
      images: product.images,
      custom_sizes: product.custom_sizes || '',
      warehouses: product.warehouses || [],
    }),
    headers: { 'Prefer': 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function updateProduct(id, updates) {
  const resp = await supabaseFetch(`/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { 'Prefer': 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function deleteProduct(id) {
  await supabaseFetch(`/rest/v1/products?id=eq.${id}`, { method: 'DELETE' });
}

// ===================== VARIANTS =====================
async function updateVariant(id, stock) {
  await supabaseFetch(`/rest/v1/product_variants?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ stock }),
  });
}

async function upsertVariant(productId, size, stock) {
  const resp = await supabaseFetch('/rest/v1/product_variants', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, size, stock }),
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function deleteVariant(id) {
  await supabaseFetch(`/rest/v1/product_variants?id=eq.${id}`, { method: 'DELETE' });
}

// ===================== CATEGORIES =====================
async function fetchCategories() {
  const resp = await supabaseFetch('/rest/v1/categories?select=*&order=id.asc', { method: 'GET' });
  const data = await resp.json();
  return (data || []).map(c => ({ ...c, hidden: c.hidden || false, parent_id: c.parent_id || null }));
}

async function createCategory(cat) {
  const resp = await supabaseFetch('/rest/v1/categories', {
    method: 'POST',
    body: JSON.stringify(cat),
    headers: { 'Prefer': 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function updateCategory(id, updates) {
  const resp = await supabaseFetch(`/rest/v1/categories?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { 'Prefer': 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function deleteCategoryDb(id) {
  await supabaseFetch(`/rest/v1/categories?id=eq.${id}`, { method: 'DELETE' });
}

// ===================== COUPONS =====================
async function fetchCoupons() {
  const resp = await supabaseFetch('/rest/v1/coupons?select=*&order=id.asc', { method: 'GET' });
  return resp.json();
}

async function createCoupon(coupon) {
  const resp = await supabaseFetch('/rest/v1/coupons', {
    method: 'POST',
    body: JSON.stringify(coupon),
    headers: { 'Prefer': 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function updateCoupon(id, updates) {
  const resp = await supabaseFetch(`/rest/v1/coupons?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { 'Prefer': 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function deleteCouponDb(id) {
  await supabaseFetch(`/rest/v1/coupons?id=eq.${id}`, { method: 'DELETE' });
}

// ===================== ORDERS =====================
async function fetchOrders() {
  const resp = await supabaseFetch('/rest/v1/orders?select=*&order=created_at.desc', { method: 'GET' });
  return resp.json();
}

async function fetchMyOrders(userId) {
  const resp = await supabaseFetch(`/rest/v1/orders?select=*&user_id=eq.${userId}&order=created_at.desc`, { method: 'GET' });
  return resp.json();
}

async function createOrder(order) {
  const resp = await supabaseFetch('/rest/v1/orders', {
    method: 'POST',
    body: JSON.stringify(order),
    headers: { 'Prefer': 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function createCheckoutOrder(params) {
  const resp = await supabaseFetch('/rest/v1/rpc/create_checkout_order', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const text = await resp.text();
    let msg;
    try { const j = JSON.parse(text); msg = j.message || j.msg || text; } catch { msg = text; }
    throw new Error(msg);
  }
  return resp.json();
}

async function updateOrderStatus(id, status) {
  const resp = await supabaseFetch(`/rest/v1/orders?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { 'Prefer': 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

async function updateOrder(id, data) {
  const resp = await supabaseFetch(`/rest/v1/orders?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { 'Prefer': 'return=representation' },
  });
  const respData = await resp.json();
  return Array.isArray(respData) ? respData[0] : respData;
}

// ===================== STORAGE =====================
async function uploadImage(file, path) {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/products/${path}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'x-upsert': 'true' },
    body: formData,
  });
  if (!resp.ok) throw new Error('Upload failed');
  return `${SUPABASE_URL}/storage/v1/object/public/products/${path}`;
}

async function deleteImage(path) {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/products/${path}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY },
  });
  if (!resp.ok) throw new Error('Delete failed');
}

async function listImages(folder) {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/list/products`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: folder || '', limit: 100, offset: 0 }),
  });
  if (!resp.ok) return [];
  return resp.json();
}

// Dummy supabase object for backward compatibility checks
window.supabase = {};

window.uploadImage = uploadImage;
window.deleteImage = deleteImage;
window.listImages = listImages;
window.fetchSetting = fetchSetting;
window.upsertSetting = upsertSetting;
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getSession = getSession;
window.getProfile = getProfile;

async function fetchProfiles() {
  const resp = await supabaseFetch('/rest/v1/profiles?select=*&order=created_at.desc', { method: 'GET' });
  return resp.json();
}
window.fetchProfiles = fetchProfiles;

async function createStaffAccount(email, password, fullName) {
  const token = sessionCache?.access_token || JSON.parse(localStorage.getItem('cuteKidsSession') || '{}').access_token;
  if (!token) throw new Error('Not authenticated');
  const resp = await fetch('/api/admin/create-staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to create staff account');
  return data;
}
window.createStaffAccount = createStaffAccount;
window.fetchProducts = fetchProducts;
window.fetchCategories = fetchCategories;
window.fetchCoupons = fetchCoupons;
window.fetchOrders = fetchOrders;
window.fetchMyOrders = fetchMyOrders;
window.createOrder = createOrder;
window.createCheckoutOrder = createCheckoutOrder;
window.updateOrderStatus = updateOrderStatus;
window.updateOrder = updateOrder;
window.deleteProduct = deleteProduct;
window.updateProduct = updateProduct;
window.createProduct = createProduct;
window.upsertVariant = upsertVariant;
window.createCategory = createCategory;
window.updateCategory = updateCategory;
window.deleteCategoryDb = deleteCategoryDb;
window.createCoupon = createCoupon;
window.updateCoupon = updateCoupon;
window.deleteCouponDb = deleteCouponDb;
