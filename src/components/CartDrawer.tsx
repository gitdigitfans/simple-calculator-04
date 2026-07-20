import { useNavigate } from '@tanstack/react-router'
import { useCartStore } from '~/stores/cart'
import { useProductStore } from '~/stores/products'
import { getCurrentLang, t } from '~/lib/translations'
import { CONFIG } from '~/lib/config'
import { useState, useMemo } from 'react'

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

export default function CartDrawer({
  isOpen,
  onClose,
  onCheckout,
}: {
  isOpen: boolean
  onClose: () => void
  onCheckout: () => void
}) {
  const navigate = useNavigate()
  const { items, removeItem, updateQuantity } = useCartStore()
  const { coupons } = useProductStore()
  const lang = getCurrentLang()

  const [couponCode, setCouponCode] = useState('')
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null)
  const [couponMessage, setCouponMessage] = useState('')

  const { subtotal, autoDiscounts, autoDiscountTotal, couponDiscount, couponLabel, totalDiscount, afterDiscount, shipping, total } =
    useMemo(() => {
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
      const af = sub - td
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
    const sub = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
    const result = calculateCouponDiscount(coupon, items, sub)
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

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen
            ? 'translate-x-0'
            : lang === 'ar'
              ? 'translate-x-full'
              : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">
              {t('cart')} ({items.reduce((s: number, i: any) => s + i.quantity, 0)})
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Empty State */}
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg className="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <p className="text-gray-500 text-lg mb-4">{t('cartEmpty')}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#1D355E] text-white rounded-full font-medium hover:bg-[#2B4A7A] transition-colors"
              >
                {t('startShopping')}
              </button>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map((item: any, idx: number) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                    <img
                      src={item.image}
                      alt={lang === 'ar' ? item.name_ar : item.name_en}
                      className="w-20 h-20 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {lang === 'ar' ? item.name_ar : item.name_en}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('size')}: {item.size}
                      </p>
                      <p className="text-sm font-bold text-[#1D355E] mt-1">
                        {item.price} {t('egp')}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-200 transition-colors text-sm"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-200 transition-colors text-sm"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItem(idx)}
                          className="ms-auto text-red-500 hover:text-red-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon & Summary */}
              <div className="border-t p-4 space-y-3">
                {/* Coupon */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder={t('couponCode')}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-[#F3B423] text-white rounded-lg text-sm font-medium hover:bg-[#D49A1A] transition-colors"
                  >
                    {t('applyCoupon')}
                  </button>
                </div>
                {appliedCouponCode && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>{couponLabel}</span>
                    <button onClick={removeCoupon} className="text-red-500 hover:text-red-700">
                      {t('remove')}
                    </button>
                  </div>
                )}
                {couponMessage && !appliedCouponCode && (
                  <p className="text-sm text-red-500">{couponMessage}</p>
                )}

                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('subTotal')}</span>
                    <span className="font-semibold">
                      {subtotal} {t('egp')}
                    </span>
                  </div>
                  {autoDiscounts.map((d, i) => (
                    <div key={i} className="flex justify-between text-green-600">
                      <span>{d.label}</span>
                      <span>
                        -{d.discountAmount} {t('egp')}
                      </span>
                    </div>
                  ))}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{couponLabel}</span>
                      <span>
                        -{couponDiscount} {t('egp')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>{t('shipping')}</span>
                    <span>
                      {shipping === 0 ? (
                        <span className="text-green-600 font-semibold">{t('freeShipping')}</span>
                      ) : (
                        `${shipping} ${t('egp')}`
                      )}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold text-[#1D355E]">
                    <span>{t('total')}</span>
                    <span>
                      {total} {t('egp')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 border-2 border-[#1D355E] text-[#1D355E] rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    {t('continueShopping')}
                  </button>
                  <button
                    onClick={onCheckout}
                    className="flex-1 py-3 bg-[#1D355E] text-white rounded-xl font-medium hover:bg-[#2B4A7A] transition-colors"
                  >
                    {t('checkout')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
