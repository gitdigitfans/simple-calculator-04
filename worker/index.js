const REWRITES = {
  '/about': '/about.html',
  '/contact': '/contact.html',
  '/products': '/products.html',
  '/product': '/product.html',
  '/admin': '/admin.html',
  '/dashboard': '/dashboard.html',
  '/checkout': '/checkout.html',
  '/thank-you': '/thank-you.html',
};

function serveAsset(resp) {
  const ct = resp.headers.get('Content-Type') || '';
  if (!ct.includes('text/html')) return resp;
  const h = new Headers();
  for (const [k, v] of resp.headers) h.set(k, v);
  h.set('Content-Type', 'text/html; charset=utf-8');
  h.set('Cache-Control', 'no-cache');
  return new Response(resp.body, { status: resp.status, headers: h });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const base = url.origin;

    if (path === '/api/upload') return handleUpload(request, env);
    if (path === '/api/delete') return handleDelete(request, env);
    if (path === '/api/admin/create-staff') return handleCreateStaff(request, env);

    const productMatch = path.match(/^\/product\/(\d+)$/);
    if (productMatch) {
      return serveAsset(await env.ASSETS.fetch(base + '/product.html'));
    }

    if (REWRITES[path]) {
      return serveAsset(await env.ASSETS.fetch(base + REWRITES[path]));
    }
    return serveAsset(await env.ASSETS.fetch(base + path));
  }
};

async function handleUpload(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'PUT') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  try {
    const filename = request.headers.get('X-Filename');
    if (!filename) return new Response(JSON.stringify({ error: 'Missing X-Filename header' }), { status: 400 });

    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    await env.R2_BUCKET.put(filename, request.body, { httpMetadata: { contentType } });

    const publicUrl = env.PUBLIC_R2_URL + '/' + filename;
    return new Response(JSON.stringify({ url: publicUrl }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

async function handleDelete(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  try {
    const { path } = await request.json();
    if (!path) return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400 });

    await env.R2_BUCKET.delete(path);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}

async function handleCreateStaff(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const token = authHeader.slice(7);
    const payload = decodeJWT(token);
    if (!payload?.sub)
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });

    const userId = payload.sub;

    // Check admin role
    const roleCheck = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    const profiles = await roleCheck.json();
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile || profile.role !== 'admin')
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });

    const { email, password, full_name } = await request.json();
    if (!email || !password || !full_name)
      return new Response(JSON.stringify({ error: 'Missing email, password, or full_name' }), { status: 400 });

    // Create auth user via Supabase Admin API (auto-confirmed)
    const createResp = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name } }),
    });
    const created = await createResp.json();
    if (!createResp.ok || created.error)
      return new Response(JSON.stringify({ error: created.msg || created.error_description || 'Failed to create user' }), { status: 400 });

    // Update existing profile (trigger already created it) with staff role
    const profileResp = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${created.id}`, {
      method: 'PATCH',
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ full_name, role: 'staff' }),
    });
    if (!profileResp.ok) {
      await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, user: { id: created.id, email, full_name } }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
