import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import CartDrawer from '~/components/CartDrawer'
import AuthModal from '~/components/AuthModal'
import { useCartStore } from '~/stores/cart'
import { useProductStore } from '~/stores/products'
import { useOrderStore } from '~/stores/orders'
import { getCurrentLang, t } from '~/lib/translations'
import { CONFIG } from '~/lib/config'
import { useState, useMemo } from 'react'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})

interface DiscountResult {
  coupon: any
  discountAmount: number
  label: string
}

function calculateAutoDiscounts(cartItems: any[], coupons: any[]): DiscountResult[] {
  const discounts: DiscountResult[] = []
  const totalItems = cartItems.reduce((s: number, i: any) => s + i.quantity, 0)
  const subtotal = cartItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
  const lang = getCurrentLang()

  for (const coupon of coupons) {
    if (!coupon.auto_apply || !coupon.active) continue
    if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) continue
    const cond =
      typeof coupon.conditions === 'string'
        ? JSON.parse(coupon.conditions)
        : coupon.conditions || {}
    let applies = false
    let matchedItems: any[] = []
    let label = ''

    if (cond.minItems && totalItems >= cond.minItems) {
      applies = true
      matchedItems = cartItems
      label =
        lang === 'ar'
          ? `خصم ${coupon.value}${coupon.type === 'percentage' ? '%' : ' جنيه'} (${totalItems} قطع)`
          : `${coupon.type === 'percentage' ? coupon.value + '%' : coupon.value + ' EGP'} off (${totalItems} items)`
    }

    if (cond.minAmount && subtotal >= cond.minAmount) {
      applies = true
      matchedItems = cartItems
      label =
        lang === 'ar'
          ? `خصم ${coupon.value}${coupon.type === 'percentage' ? '%' : ' جنيه'} (أكثر من ${cond.minAmount} جنيه)`
          : `${coupon.type === 'percentage' ? coupon.value + '%' : coupon.value + ' EGP'} off (over ${cond.minAmount} EGP)`
    }

    if (cond.sizes && cond.sizes.length > 0) {
      const sizeItems = cartItems.filter((i: any) => cond.sizes.includes(i.size))
      if (sizeItems.length > 0) {
        applies = true
        matchedItems = sizeItems
        const sizesLabel = cond.sizes.join(', ')
        label =
          lang === 'ar'
            ? `خصم ${coupon.value}${coupon.type === 'percentage' ? '%' : ' جنيه'} على مقاسات ${sizesLabel}`
            : `${coupon.type === 'percentage' ? coupon.value + '%' : coupon.value + ' EGP'} off on sizes ${sizesLabel}`
      }
    } else if (cond.size) {
      const sizeItems = cartItems.filter((i: any) => i.size === cond.size)
      if (sizeItems.length > 0) {
        applies = true
        matchedItems = sizeItems
        label =
          lang === 'ar'
            ? `خصم ${coupon.value}% على مقاس ${cond.size}`
            : `${coupon.value}% off on size ${cond.size}`
      }
    }

    if (applies && matchedItems.length > 0) {
      let discountAmount = 0
      if (coupon.type === 'percentage') {
        const affectedTotal = matchedItems.reduce(
          (s: number, i: any) => s + i.price * i.quantity,
          0,
        )
        discountAmount = Math.round((affectedTotal * coupon.value) / 100)
      } else {
        discountAmount = coupon.value
      }
      discounts.push({ coupon, discountAmount, label })
    }
  }

  return discounts
}

function calculateCouponDiscount(
  coupon: any,
  cartItems: any[],
  currentTotal: number,
): { amount: number; label: string } {
  const cond =
    typeof coupon.conditions === 'string'
      ? JSON.parse(coupon.conditions)
      : coupon.conditions || {}
  let affectedItems = cartItems

  const totalItems = cartItems.reduce((s: number, i: any) => s + i.quantity, 0)
  if (cond.minItems && totalItems < cond.minItems) return { amount: 0, label: '' }
  if (cond.minAmount) {
    const subtotal = cartItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
    if (subtotal < cond.minAmount) return { amount: 0, label: '' }
  }
  if (cond.category) {
    affectedItems = cartItems.filter((i: any) => i.category === cond.category)
    if (affectedItems.length === 0) return { amount: 0, label: '' }
  }
  if (cond.size) {
    affectedItems = cartItems.filter((i: any) => i.size === cond.size)
    if (affectedItems.length === 0) return { amount: 0, label: '' }
  }

  const lang = getCurrentLang()
  let amount = 0
  let label = ''
  if (coupon.type === 'percentage') {
    const affectedTotal = affectedItems.reduce(
      (s: number, i: any) => s + i.price * i.quantity,
      0,
    )
    amount = Math.round((affectedTotal * coupon.value) / 100)
    label = `${coupon.code}: ${coupon.value}%`
  } else {
    amount = Math.min(coupon.value, currentTotal)
    label = `${coupon.code}: ${coupon.value} ${lang === 'ar' ? 'جنيه' : 'EGP'}`
  }

  return { amount, label }
}

function CheckoutPage() {
  const navigate = useNavigate()
  const { items, removeItem, clearCart } = useCartStore()
  const { coupons } = useProductStore()
  const { placeOrder } = useOrderStore()
  const lang = getCurrentLang()

  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [couponCode, setCouponCode] = useState('')
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null)
  const [couponMessage, setCouponMessage] = useState('')

  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const totals = useMemo(() => {
    const sub = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
    const ad = calculateAutoDiscounts(items, coupons)
    const adTotal = ad.reduce((s: number, d: DiscountResult) => s + d.discountAmount, 0)

    let cd = 0
    let cl = ''
    if (appliedCouponCode) {
      const coupon = coupons.find(
        (c: any) => c.code === appliedCouponCode && !c.auto_apply,
      )
      if (coupon) {
        const result = calculateCouponDiscount(coupon, items, sub - adTotal)
        cd = result.amount
        cl = result.label
      }
    }

    const td = adTotal + cd
    const af = Math.max(0, sub - td)
    const ship = af >= CONFIG.freeShippingMin ? 0 : CONFIG.shippingCost
    const tot = af + ship

    return {
      subtotal: sub,
      autoDiscounts: ad,
      autoDiscountTotal: adTotal,
      couponDiscount: cd,
      couponLabel: cl,
      totalDiscount: td,
      afterDiscount: af,
      shipping: ship,
      total: tot,
    }
  }, [items, coupons, appliedCouponCode])

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) return
    const coupon = coupons.find(
      (c: any) => c.code?.toUpperCase() === code && !c.auto_apply && c.active,
    )
    if (!coupon) {
      setCouponMessage(t('invalidCoupon'))
      return
    }
    const result = calculateCouponDiscount(coupon, items, totals.afterDiscount)
    if (result.amount <= 0) {
      setCouponMessage(t('invalidCoupon'))
      return
    }
    setAppliedCouponCode(coupon.code)
    setCouponCode('')
    setCouponMessage(`${t('couponApplied')}! ${result.label}`)
  }

  const removeCoupon = () => {
    setAppliedCouponCode(null)
    setCouponMessage('')
  }

  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/\s/g, '')
    const isValid = /^01[0125]\d{8}$/.test(cleaned)
    setPhoneError(isValid ? '' : (lang === 'ar' ? 'رقم الهاتف غير صحيح (مثال: 01XXXXXXXXX)' : 'Invalid phone number (e.g. 01XXXXXXXXX)'))
    return isValid
  }

  const handlePlaceOrder = async () => {
    setError('')

    if (!fullName.trim()) {
      setError(lang === 'ar' ? 'يرجى إدخال الاسم بالكامل' : 'Please enter your full name')
      return
    }
    if (!validatePhone(phone)) return
    if (!city.trim()) {
      setError(lang === 'ar' ? 'يرجى إدخال المدينة' : 'Please enter your city')
      return
    }
    if (!address.trim()) {
      setError(lang === 'ar' ? 'يرجى إدخال العنوان بالتفصيل' : 'Please enter your full address')
      return
    }

    setPlacing(true)
    try {
      const orderItems = items.map((item) => ({
        product_id: item.productId,
        size: item.size,
        quantity: item.quantity,
      }))

      const order = await placeOrder({
        items: orderItems,
        shipping_name: fullName.trim(),
        shipping_phone: phone.trim(),
        shipping_city: city.trim(),
        shipping_address: address.trim(),
        notes: notes.trim(),
        coupon_code: appliedCouponCode,
        discount: totals.totalDiscount,
      })

      const orderData = {
        id: order.id,
        items: items.map((item) => ({
          name_ar: item.name_ar,
          name_en: item.name_en,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        customer_name: fullName.trim(),
        customer_phone: phone.trim(),
        customer_city: city.trim(),
        customer_address: address.trim(),
        total: order.total,
        status: 'pending',
        created_at: order.created_at,
      }

      try {
        const existing = JSON.parse(localStorage.getItem('cuteKidsOrders') || '[]')
        existing.push(orderData)
        localStorage.setItem('cuteKidsOrders', JSON.stringify(existing))
      } catch {
        localStorage.setItem('cuteKidsOrders', JSON.stringify([orderData]))
      }

      clearCart()
      navigate({ to: '/thank-you' })
    } catch (err: any) {
      setError(err?.message || (lang === 'ar' ? 'حدث خطأ أثناء تقديم الطلب' : 'An error occurred while placing the order'))
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0 && !placing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header onCartClick={() => setCartOpen(true)} />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('cartEmpty')}</h1>
            <p className="text-gray-500 mb-6">
              {lang === 'ar' ? 'أضف بعض المنتجات أولاً' : 'Add some products first'}
            </p>
            <Link
              to="/products"
              className="inline-block px-6 py-3 bg-[#1D355E] text-white rounded-xl font-medium hover:bg-[#2B4A7A] transition-colors"
            >
              {t('navProducts')}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartClick={() => setCartOpen(true)} />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-[#1D355E] transition-colors">{t('home')}</Link>
          <span>/</span>
          <span className="text-gray-800">{t('checkout')}</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('checkout')}</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Checkout Form - Left Column */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
              <h2 className="text-lg font-bold text-gray-900">
                {lang === 'ar' ? 'بيانات التوصيل' : 'Shipping Details'}
              </h2>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423] transition-all"
                  dir="rtl"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (phoneError) validatePhone(e.target.value)
                  }}
                  onBlur={() => phone && validatePhone(phone)}
                  placeholder="01XXXXXXXXX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423] transition-all"
                  dir="ltr"
                />
                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('city')}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423] transition-all"
                  dir="rtl"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('address')}</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423] transition-all resize-none"
                  dir="rtl"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423] transition-all resize-none"
                  dir="rtl"
                />
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('paymentMethod')}</h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-5 h-5 rounded-full border-4 border-[#1D355E] shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t('payment')}</p>
                    <p className="text-xs text-gray-500">{t('paymentDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary - Right Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">{t('orderSummary')}</h2>

              {/* Items */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map((item: any, idx: number) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3 items-center">
                    <img
                      src={item.image}
                      alt={lang === 'ar' ? item.name_ar : item.name_en}
                      className="w-14 h-14 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lang === 'ar' ? item.name_ar : item.name_en}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('size')}: {item.size} | {t('quantity')}: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 shrink-0">
                      {item.price * item.quantity} {t('egp')}
                    </p>
                  </div>
                ))}
              </div>

              <hr className="border-gray-100" />

              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('subTotal')}</span>
                <span className="font-semibold">
                  {totals.subtotal} {t('egp')}
                </span>
              </div>

              {/* Auto Discounts */}
              {totals.autoDiscounts.map((d, i) => (
                <div key={i} className="flex justify-between text-sm text-green-600">
                  <span>{d.label}</span>
                  <span>
                    -{d.discountAmount} {t('egp')}
                  </span>
                </div>
              ))}

              {/* Coupon Discount */}
              {totals.couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{totals.couponLabel}</span>
                  <span>
                    -{totals.couponDiscount} {t('egp')}
                  </span>
                </div>
              )}

              {/* Coupon Input */}
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder={t('couponCode')}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-[#F3B423] text-white rounded-xl text-sm font-medium hover:bg-[#D49A1A] transition-colors"
                  >
                    {t('applyCoupon')}
                  </button>
                </div>
                {appliedCouponCode && (
                  <div className="flex items-center justify-between text-xs text-green-600 mt-1">
                    <span>{totals.couponLabel}</span>
                    <button onClick={removeCoupon} className="text-red-500 hover:text-red-700">
                      {t('remove')}
                    </button>
                  </div>
                )}
                {couponMessage && !appliedCouponCode && (
                  <p className="text-xs text-red-500 mt-1">{couponMessage}</p>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Shipping */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('shipping')}</span>
                <span>
                  {totals.shipping === 0 ? (
                    <span className="text-green-600 font-semibold">{t('freeShipping')}</span>
                  ) : (
                    <span>{totals.shipping} {t('egp')}</span>
                  )}
                </span>
              </div>

              {/* Total */}
              <div className="flex justify-between text-lg font-bold text-[#1D355E] pt-2 border-t">
                <span>{t('total')}</span>
                <span>
                  {totals.total} {t('egp')}
                </span>
              </div>

              {/* Place Order */}
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="w-full py-4 bg-[#1D355E] text-white rounded-xl font-bold text-lg hover:bg-[#2B4A7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placing
                  ? (lang === 'ar' ? 'جاري تقديم الطلب...' : 'Placing order...')
                  : t('confirmOrder')}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => setCartOpen(false)}
      />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
