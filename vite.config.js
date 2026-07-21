// Vite config that mirrors server.js/worker rewrites for the Lovable preview.
// Static HTML pages live at the project root; Vite serves them directly.
import fs from 'node:fs';
import path from 'node:path';

const PAGE_REWRITES = {
  '/products': '/products.html',
  '/product': '/product.html',
  '/about': '/about.html',
  '/contact': '/contact.html',
  '/dashboard': '/dashboard.html',
  '/admin': '/admin.html',
  '/checkout': '/checkout.html',
  '/thank-you': '/thank-you.html',
};

function rewriteMiddleware() {
  return {
    name: 'cute-kids-rewrites',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          let pathname = url.pathname;

          // /product/:id  ->  /product.html
          if (/^\/product\/[^/]+$/.test(pathname)) {
            pathname = '/product.html';
          } else if (PAGE_REWRITES[pathname]) {
            pathname = PAGE_REWRITES[pathname];
          }

          if (pathname !== url.pathname) {
            req.url = pathname + url.search;
          }
        } catch {}
        next();
      });
    },
  };
}

export default {
  appType: 'mpa', // multi-page: don't fall back to index.html for unknown routes
  server: {
    host: true,
    port: 8080,
    strictPort: false,
  },
  plugins: [rewriteMiddleware()],
};
