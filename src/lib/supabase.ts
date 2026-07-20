import { CONFIG } from '~/lib/config';
import type { Product, Category, Coupon, Order, Profile, Session } from '~/lib/types';

const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

let sessionCache: { access_token: string; refresh_token?: string; expires_at?: number; user?: any } | null = null;

async function supabaseFetch(path: string, opts: RequestInit & { count?: boolean } = {}) {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
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
    let msg: string;
    try {
      const j = JSON.parse(text);
      msg = j.msg || j.error_description || j.message || text;
    } catch {
      msg = text;
    }
    throw new Error(msg);
  }
  return resp;
}

// ===================== AUTH =====================
export async function signUp(email: string, password: string, fullName: string, phone: string) {
  const resp = await supabaseFetch('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, data: { full_name: fullName, phone } }),
  });
  const data = await resp.json();
  if (data.access_token) {
    sessionCache = data;
    const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    localStorage.setItem(
      'cuteKidsSession',
      JSON.stringify({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: expiresAt }),
    );
  }
  return data;
}

export async function signIn(email: string, password: string) {
  sessionCache = null;
  const resp = await supabaseFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await resp.json();
  sessionCache = data;
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  localStorage.setItem(
    'cuteKidsSession',
    JSON.stringify({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: expiresAt }),
  );
  return { user: data.user, session: { access_token: data.access_token, user: data.user } };
}

export async function signOut() {
  const token =
    sessionCache?.access_token ||
    JSON.parse(localStorage.getItem('cuteKidsSession') || '{}').access_token;
  if (token) {
    try {
      await supabaseFetch('/auth/v1/logout', { method: 'POST' });
    } catch {
      // ignore
    }
  }
  sessionCache = null;
  localStorage.removeItem('cuteKidsSession');
}

export async function getSession(): Promise<Session | null> {
  if (sessionCache?.access_token) {
    try {
      const resp = await supabaseFetch('/auth/v1/user', {
        headers: { Authorization: `Bearer ${sessionCache.access_token}` },
      });
      if (resp.ok) {
        const user = await resp.json();
        return { user, access_token: sessionCache.access_token };
      }
    } catch {
      // continue to fallback
    }
  }
  const saved = localStorage.getItem('cuteKidsSession');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.expires_at && parsed.expires_at > Date.now()) {
        sessionCache = parsed;
        const resp = await supabaseFetch('/auth/v1/user', {
          headers: { Authorization: `Bearer ${parsed.access_token}` },
        });
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
          localStorage.setItem(
            'cuteKidsSession',
            JSON.stringify({
              access_token: refreshData.access_token,
              refresh_token: refreshData.refresh_token,
              expires_at: expiresAt,
            }),
          );
          return { user: refreshData.user, access_token: refreshData.access_token };
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const resp = await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}&select=*`, { method: 'GET' });
    const profiles = await resp.json();
    return profiles?.[0] || null;
  } catch {
    return null;
  }
}

// ===================== SETTINGS =====================
export async function fetchSetting(key: string): Promise<any> {
  try {
    const resp = await supabaseFetch(`/rest/v1/settings?key=eq.${key}&select=value`, { method: 'GET' });
    const data = await resp.json();
    return data?.[0]?.value || null;
  } catch {
    return null;
  }
}

export async function upsertSetting(key: string, value: any) {
  await supabaseFetch('/rest/v1/settings', {
    method: 'POST',
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    headers: { Prefer: 'resolution=merge-duplicates' },
  });
  return value;
}

// ===================== PRODUCTS =====================
export async function fetchProducts(): Promise<Product[]> {
  const resp = await supabaseFetch('/rest/v1/products?select=*,product_variants(*)&order=created_at.desc', {
    method: 'GET',
  });
  return resp.json();
}

export async function fetchProduct(id: number): Promise<Product | null> {
  const resp = await supabaseFetch(`/rest/v1/products?id=eq.${id}&select=*,product_variants(*)`, { method: 'GET' });
  const data = await resp.json();
  return data?.[0] || null;
}

// ===================== CATEGORIES =====================
export async function fetchCategories(): Promise<Category[]> {
  const resp = await supabaseFetch('/rest/v1/categories?select=*&order=id.asc', { method: 'GET' });
  const data = await resp.json();
  return (data || []).map((c: any) => ({
    ...c,
    hidden: c.hidden || false,
    parent_id: c.parent_id || null,
  }));
}

// ===================== COUPONS =====================
export async function fetchCoupons(): Promise<Coupon[]> {
  const resp = await supabaseFetch('/rest/v1/coupons?select=*&order=id.asc', { method: 'GET' });
  return resp.json();
}

// ===================== ORDERS =====================
export async function fetchOrders(): Promise<Order[]> {
  const resp = await supabaseFetch('/rest/v1/orders?select=*&order=created_at.desc', { method: 'GET' });
  return resp.json();
}

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  const resp = await supabaseFetch(`/rest/v1/orders?select=*&user_id=eq.${userId}&order=created_at.desc`, {
    method: 'GET',
  });
  return resp.json();
}

export async function createCheckoutOrder(params: {
  p_items: { product_id: number; size: string; quantity: number }[];
  p_shipping_name: string;
  p_shipping_phone: string;
  p_shipping_city: string;
  p_shipping_address: string;
  p_notes: string;
  p_coupon_code: string | null;
  p_discount: number;
}): Promise<{ id: number; total: number }> {
  const resp = await supabaseFetch('/rest/v1/rpc/create_checkout_order', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const text = await resp.text();
    let msg: string;
    try {
      const j = JSON.parse(text);
      msg = j.message || j.msg || text;
    } catch {
      msg = text;
    }
    throw new Error(msg);
  }
  return resp.json();
}

export async function updateOrderStatus(id: number, status: string): Promise<Order> {
  const resp = await supabaseFetch(`/rest/v1/orders?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { Prefer: 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function updateOrder(id: number, data: Record<string, any>): Promise<Order> {
  const resp = await supabaseFetch(`/rest/v1/orders?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { Prefer: 'return=representation' },
  });
  const result = await resp.json();
  return Array.isArray(result) ? result[0] : result;
}

export async function createProduct(product: {
  category_id?: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price: number;
  images: string[];
  custom_sizes?: string;
  warehouses?: any[];
}): Promise<Product> {
  const resp = await supabaseFetch('/rest/v1/products', {
    method: 'POST',
    body: JSON.stringify(product),
    headers: { Prefer: 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function updateProduct(id: number, updates: Record<string, any>): Promise<Product> {
  const resp = await supabaseFetch(`/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { Prefer: 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteProduct(id: number): Promise<void> {
  await supabaseFetch(`/rest/v1/products?id=eq.${id}`, { method: 'DELETE' });
}

export async function upsertVariant(productId: number, size: string, stock: number): Promise<any> {
  const resp = await supabaseFetch('/rest/v1/product_variants', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, size, stock }),
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteVariant(id: number): Promise<void> {
  await supabaseFetch(`/rest/v1/product_variants?id=eq.${id}`, { method: 'DELETE' });
}

export async function createCategory(cat: Partial<Category>): Promise<Category> {
  const resp = await supabaseFetch('/rest/v1/categories', {
    method: 'POST',
    body: JSON.stringify(cat),
    headers: { Prefer: 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function updateCategory(id: string, updates: Record<string, any>): Promise<Category> {
  const resp = await supabaseFetch(`/rest/v1/categories?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { Prefer: 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteCategoryDb(id: string): Promise<void> {
  await supabaseFetch(`/rest/v1/categories?id=eq.${id}`, { method: 'DELETE' });
}

export async function createCoupon(coupon: Partial<Coupon>): Promise<Coupon> {
  const resp = await supabaseFetch('/rest/v1/coupons', {
    method: 'POST',
    body: JSON.stringify(coupon),
    headers: { Prefer: 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function updateCoupon(id: number, updates: Record<string, any>): Promise<Coupon> {
  const resp = await supabaseFetch(`/rest/v1/coupons?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { Prefer: 'return=representation' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteCouponDb(id: number): Promise<void> {
  await supabaseFetch(`/rest/v1/coupons?id=eq.${id}`, { method: 'DELETE' });
}

export async function fetchProfiles(): Promise<Profile[]> {
  const resp = await supabaseFetch('/rest/v1/profiles?select=*&order=created_at.desc', { method: 'GET' });
  return resp.json();
}

export async function updateProfileRole(userId: string, role: string): Promise<void> {
  await supabaseFetch(`/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
    headers: { Prefer: 'return=representation' },
  });
}

export async function createStaffAccount(email: string, password: string, fullName: string): Promise<any> {
  const token =
    sessionCache?.access_token ||
    JSON.parse(localStorage.getItem('cuteKidsSession') || '{}').access_token;
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
