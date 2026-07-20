import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultErrorComponent: ({ error }) => (
      <div className="min-h-screen flex items-center justify-center bg-brand-navy/5">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold text-brand-navy mb-4">خطأ!</h1>
          <p className="text-gray-600 mb-6">{error.message || 'حدث خطأ غير متوقع'}</p>
          <a href="/" className="px-6 py-3 bg-brand-yellow text-brand-navy font-bold rounded-xl hover:bg-brand-yellow-dark transition">
            العودة للرئيسية
          </a>
        </div>
      </div>
    ),
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
