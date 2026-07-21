const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const BASE = __dirname;
const PAGE_REWRITES = {
  '/about': '/about.html',
  '/contact': '/contact.html',
  '/products': '/products.html',
  '/product': '/product.html',
  '/admin': '/admin.html',
  '/dashboard': '/dashboard.html',
  '/checkout': '/checkout.html',
  '/thank-you': '/thank-you.html',
};
const R2 = {
  accountId: 'e3f59a7681d4e1f491c87a3a358c8206',
  accessKey: '35c39ac4c0afcf637740008f98e9398f',
  secretKey: '9464ace63ceab7295259ba99f092824c4e81ad83e86688ff3844488ae9da87dc',
  bucket: 'r2-love',
  publicUrl: 'https://pub-d67e1ad194f24e2a95a4606ccadb7b07.r2.dev',
};

function sha256(d) { return crypto.createHash('sha256').update(d).digest('hex'); }
function hmac(k, d) { return crypto.createHmac('sha256', k).update(d).digest(); }

function s3Sign(method, objectPath, body, contentType) {
  const now = new Date();
  const ds = now.toISOString().split('T')[0].replace(/-/g, '');
  const amz = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const region = 'auto', service = 's3';
  const uri = '/' + R2.bucket + '/' + objectPath;
  const ph = sha256(body || '');
  const ct = contentType ? 'content-type:' + contentType + '\n' : '';
  const sh = contentType ? 'content-type;host;x-amz-content-sha256;x-amz-date' : 'host;x-amz-content-sha256;x-amz-date';
  const ch = ct + 'host:' + R2.accountId + '.r2.cloudflarestorage.com\nx-amz-content-sha256:' + ph + '\nx-amz-date:' + amz + '\n';
  const cr = method + '\n' + uri + '\n\n' + ch + '\n' + sh + '\n' + ph;
  const cs = ds + '/' + region + '/' + service + '/aws4_request';
  const sts = 'AWS4-HMAC-SHA256\n' + amz + '\n' + cs + '\n' + sha256(cr);
  let k = hmac('AWS4' + R2.secretKey, ds);
  k = hmac(k, region); k = hmac(k, service); k = hmac(k, 'aws4_request');
  return { Authorization: 'AWS4-HMAC-SHA256 Credential=' + R2.accessKey + '/' + cs + ', SignedHeaders=' + sh + ', Signature=' + hmac(k, sts).toString('hex'), 'x-amz-date': amz, 'x-amz-content-sha256': ph, 'Content-Type': contentType || '' };
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

http.createServer((req, res) => {
  // API routes
  if (req.url.startsWith('/api/upload')) {
    const filename = req.headers['x-filename'];
    if (!filename) return sendJson(res, 400, { error: 'Missing X-Filename header' });
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const h = s3Sign('PUT', filename, body, contentType);
        const r2Resp = await fetch('https://' + R2.accountId + '.r2.cloudflarestorage.com/' + R2.bucket + '/' + filename, { method: 'PUT', headers: h, body });
        if (!r2Resp.ok) return sendJson(res, 502, { error: 'R2 upload failed: ' + r2Resp.status });
        sendJson(res, 200, { url: R2.publicUrl + '/' + filename });
      } catch (e) { sendJson(res, 500, { error: e.message }); }
    });
    return;
  }

  if (req.url.startsWith('/api/delete')) {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        if (!body.path) return sendJson(res, 400, { error: 'Missing path' });
        const h = s3Sign('DELETE', body.path);
        const r2Resp = await fetch('https://' + R2.accountId + '.r2.cloudflarestorage.com/' + R2.bucket + '/' + body.path, { method: 'DELETE', headers: h });
        if (!r2Resp.ok && r2Resp.status !== 404) return sendJson(res, 502, { error: 'R2 delete failed: ' + r2Resp.status });
        sendJson(res, 200, { success: true });
      } catch (e) { sendJson(res, 500, { error: e.message }); }
    });
    return;
  }

  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  if (/^\/product\/[^/]+$/.test(url)) url = '/product.html';
  if (PAGE_REWRITES[url]) url = PAGE_REWRITES[url];

  const filePath = path.normalize(path.join(BASE, url));
  if (!filePath.startsWith(BASE)) {
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>403 - Forbidden</h1><a href="/">رجوع</a>');
    return;
  }

  const ext = path.extname(filePath) || '.html';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 - Page Not Found</h1><a href="/">رجوع</a>');
    } else {
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    }
  });
}).listen(process.env.PORT || 8080, () => {
  const port = process.env.PORT || 8080;
  console.log('🚀 Cute Kids Store running at:');
  console.log('   ➜ Store:  http://localhost:' + port);
  console.log('   ➜ Admin: http://localhost:' + port + '/admin.html');
});
