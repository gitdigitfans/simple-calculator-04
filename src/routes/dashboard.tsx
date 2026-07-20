import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { t, getCurrentLang } from '~/lib/translations'
import { useAuthStore } from '~/stores/auth'
import { useOrderStore } from '~/stores/orders'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import CartDrawer from '~/components/CartDrawer'
import AuthModal from '~/components/AuthModal'
import FAB from '~/components/FAB'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const lang = getCurrentLang()
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  const { session, profile } = useAuthStore()
  const { orders, loading, loadOrders } = useOrderStore()

  useEffect(() => {
    if (!session?.user && !useAuthStore.getState().loading) {
      navigate({ to: '/' })
    }
  }, [session, navigate])

  useEffect(() => {
    if (session?.user) {
      loadOrders(session.user.id)
    }
  }, [session, loadOrders])

  const roleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return t('admin')
      case 'user':
        return t('user')
      default:
        return role
    }
  }

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

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-bold text-[#1D355E] mb-8">{t('dashboard')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-24">
              <div className="text-center mb-6 pb-4 border-b">
                <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B9D] to-[#C850C0] rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-3xl text-white font-bold">
                    {profile?.full_name?.charAt(0) || session.user.email?.charAt(0) || '?'}
                  </span>
                </div>
                <p className="font-bold text-[#1D355E]">{profile?.full_name || '-'}</p>
                <p className="text-sm text-gray-500">{session.user.email}</p>
              </div>

              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`w-full text-right px-4 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === 'info'
                      ? 'bg-gradient-to-r from-[#FF6B9D] to-[#C850C0] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t('personalInfo')}
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full text-right px-4 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-gradient-to-r from-[#FF6B9D] to-[#C850C0] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t('myOrders')}
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* Personal Info Tab */}
            {activeTab === 'info' && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-[#1D355E] mb-6">{t('personalInfo')}</h2>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center border-b pb-4">
                    <span className="text-gray-500 w-40 shrink-0 mb-1 sm:mb-0">{t('fullName')}</span>
                    <span className="font-medium text-[#1D355E]">{profile?.full_name || '-'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center border-b pb-4">
                    <span className="text-gray-500 w-40 shrink-0 mb-1 sm:mb-0">{t('email')}</span>
                    <span className="font-medium text-[#1D355E]">{session.user.email || '-'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center border-b pb-4">
                    <span className="text-gray-500 w-40 shrink-0 mb-1 sm:mb-0">{t('role')}</span>
                    <span className="font-medium text-[#1D355E]">{roleLabel(profile?.role || 'user')}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <span className="text-gray-500 w-40 shrink-0 mb-1 sm:mb-0">{t('phone')}</span>
                    <span className="font-medium text-[#1D355E]">{profile?.phone || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-[#1D355E] mb-6">{t('myOrders')}</h2>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-10 h-10 border-4 border-[#FF6B9D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📦</div>
                    <p className="text-gray-500 text-lg mb-4">{t('noOrders')}</p>
                    <button
                      onClick={() => navigate({ to: '/' })}
                      className="bg-gradient-to-r from-[#FF6B9D] to-[#C850C0] text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-opacity"
                    >
                      {t('continueShopping')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-xl overflow-hidden">
                        <button
                          onClick={() =>
                            setExpandedOrder(expandedOrder === order.id ? null : order.id)
                          }
                          className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 transition-colors text-right"
                        >
                          <div className="flex items-center gap-4 mb-2 sm:mb-0">
                            <span className="font-bold text-[#1D355E]">#{order.id}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(order.status)}`}>
                              {statusLabel(order.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">
                              {new Date(order.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                            </span>
                            <span className="font-bold text-[#FF6B9D]">{order.total} {t('egp')}</span>
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ${
                                expandedOrder === order.id ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {expandedOrder === order.id && order.items && order.items.length > 0 && (
                          <div className="border-t bg-gray-50 p-4">
                            <div className="space-y-2">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm py-2 border-b last:border-b-0">
                                  <span className="text-gray-700">
                                    {lang === 'ar' ? item.name_ar : item.name_en} - {item.size}
                                  </span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-gray-500">×{item.quantity}</span>
                                    <span className="font-medium text-[#1D355E]">{item.price * item.quantity} {t('egp')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <FAB />
    </div>
  )
}
