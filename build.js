const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');
const excluded = new Set(['node_modules', 'dist', '.git', 'worker']);
const pageAliases = {
  'products.html': 'products',
  'product.html': 'product',
  'about.html': 'about',
  'contact.html': 'contact',
  'dashboard.html': 'dashboard',
  'admin.html': 'admin',
  'checkout.html': 'checkout',
  'thank-you.html': 'thank-you',
};

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const item of fs.readdirSync(root)) {
  if (excluded.has(item)) continue;

  const source = path.join(root, item);
  const target = path.join(dist, item);
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.cpSync(source, target, { recursive: true });
  } else if (item.endsWith('.html') || item === '_headers' || item === '_redirects') {
    fs.copyFileSync(source, target);
  }
}

for (const [htmlFile, alias] of Object.entries(pageAliases)) {
  const source = path.join(dist, htmlFile);
  if (fs.existsSync(source)) {
    const dir = path.join(dist, alias);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(source, path.join(dir, 'index.html'));
  }
}