import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { t, getCurrentLang } from '~/lib/translations'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import CartDrawer from '~/components/CartDrawer'
import AuthModal from '~/components/AuthModal'
import FAB from '~/components/FAB'

export const Route = createFileRoute('/thank-you')({
  component: ThankYouPage,
})

interface LastOrder {
  id: number
  total: number
  status: string
  items: { name_ar: string; name_en: string; size: string; quantity: number; price: number }[]
  createdAt: string
}

function ThankYouPage() {
  const lang = getCurrentLang()
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [order, setOrder] = useState<LastOrder | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cuteKidsLastOrder')
      if (raw) {
        setOrder(JSON.parse(raw))
      }
    } catch {
      setOrder(null)
    }
  }, [])

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t('pending')
      case 'confirmed':
        return t('confirmed')
      case 'shipped':
        return t('shipped')
      case 'delivered':
        return t('delivered')
      default:
        return status
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'confirmed':
        return 'bg-blue-100 text-blue-700'
      case 'shipped':
        return 'bg-purple-100 text-purple-700'
      case 'delivered':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-[#1D355E] mb-3">{t('orderSuccess')}</h1>
          <p className="text-gray-500 mb-8">
            {lang === 'ar'
              ? 'شكراً لك! تم استلام طلبك وسنتواصل معك قريباً لتأكيد التفاصيل.'
              : 'Thank you! Your order has been received and we will contact you soon to confirm details.'}
          </p>

          {/* Order Details */}
          {order && (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-right mb-8">
              <h3 className="font-bold text-[#1D355E] mb-4">
                {lang === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('orderNumber')}</span>
                  <span className="font-bold text-[#1D355E]">#{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('orderDate')}</span>
                  <span className="text-gray-700">
                    {new Date(order.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t('orderStatus')}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-gray-500 mb-2">
                      {lang === 'ar' ? 'المنتجات' : 'Items'} ({order.items.length})
                    </p>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between py-1 text-gray-600">
                        <span>
                          {lang === 'ar' ? item.name_ar : item.name_en} - {item.size} × {item.quantity}
                        </span>
                        <span>{item.price * item.quantity} {t('egp')}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold">{t('total')}</span>
                  <span className="font-bold text-[#FF6B9D] text-lg">{order.total} {t('egp')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="bg-gradient-to-r from-[#FF6B9D] to-[#C850C0] text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-opacity"
            >
              {t('continueShopping')}
            </Link>
            <Link
              to="/"
              className="border-2 border-[#1D355E] text-[#1D355E] font-bold py-3 px-8 rounded-full hover:bg-[#1D355E] hover:text-white transition-colors"
            >
              {t('home')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <FAB />
    </div>
  )
}
