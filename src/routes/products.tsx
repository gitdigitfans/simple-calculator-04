import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useProductStore, type FilterState } from '~/stores/products'
import { getCurrentLang, t } from '~/lib/translations'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import CartDrawer from '~/components/CartDrawer'
import AuthModal from '~/components/AuthModal'
import FAB from '~/components/FAB'
import PopupModal from '~/components/PopupModal'
import ProductCard from '~/components/ProductCard'

interface ProductsSearch {
  category?: string
  q?: string
}

export const Route = createFileRoute('/products')({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => ({
    category: (search.category as string) || undefined,
    q: (search.q as string) || undefined,
  }),
  component: ProductsPage,
})

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const lang = getCurrentLang()
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    function calc() {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 }
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      }
    }
    setTimeLeft(calc())
    const interval = setInterval(() => setTimeLeft(calc()), 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) return null

  return (
    <div className="bg-gradient-to-l from-[#F3B423] to-[#D49A1A] text-white py-3 px-4 text-center">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium text-sm">
          {lang === 'ar' ? 'عرض محدود! ينتهي خلال' : 'Limited offer! Ends in'}
        </span>
        <div className="flex items-center gap-1 font-bold text-lg" dir="ltr">
          <span className="bg-white/20 rounded px-2 py-0.5">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span>:</span>
          <span className="bg-white/20 rounded px-2 py-0.5">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span>:</span>
          <span className="bg-white/20 rounded px-2 py-0.5">{String(timeLeft.seconds).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  )
}

function FilterSidebar({
  filters,
  setFilters,
  availableSizes,
  parentCategories,
  getSubcategories,
}: {
  filters: FilterState
  setFilters: (f: FilterState) => void
  availableSizes: string[]
  parentCategories: { id: string; slug: string; name_ar: string; name_en: string }[]
  getSubcategories: (slug: string) => { id: string; slug: string; name_ar: string; name_en: string }[]
}) {
  const lang = getCurrentLang()
  const [mobileOpen, setMobileOpen] = useState(false)

  const subcategories = filters.category ? getSubcategories(filters.category) : []

  const content = (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-800">{t('filterBy')}</h3>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">{t('category')}</label>
        <select
          value={filters.category || ''}
          onChange={(e) =>
            setFilters({ ...filters, category: e.target.value || null, subcategory: null })
          }
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
        >
          <option value="">{t('allCategories')}</option>
          {parentCategories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {lang === 'ar' ? cat.name_ar : cat.name_en}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">{t('categories')}</label>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() =>
                  setFilters({
                    ...filters,
                    subcategory: filters.subcategory === sub.slug ? null : sub.slug,
                  })
                }
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.subcategory === sub.slug
                    ? 'bg-[#1D355E] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {lang === 'ar' ? sub.name_ar : sub.name_en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">{t('available')}</label>
        <select
          value={filters.availability}
          onChange={(e) =>
            setFilters({ ...filters, availability: e.target.value as 'all' | 'available' })
          }
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
        >
          <option value="all">{t('allAvailability')}</option>
          <option value="available">{t('availableOnly')}</option>
        </select>
      </div>

      {/* Sizes */}
      {availableSizes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">{t('size')}</label>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => {
              const isSelected = filters.size?.includes(size) || false
              return (
                <button
                  key={size}
                  onClick={() => {
                    const current = filters.size || []
                    const next = isSelected ? current.filter((s) => s !== size) : [...current, size]
                    setFilters({ ...filters, size: next.length > 0 ? next : null })
                  }}
                  className={`w-10 h-10 rounded-lg text-sm font-medium border transition-colors ${
                    isSelected
                      ? 'bg-[#1D355E] text-white border-[#1D355E]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#1D355E]'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Clear */}
      <button
        onClick={() =>
          setFilters({ category: null, subcategory: null, availability: 'all', size: null })
        }
        className="w-full py-2 border-2 border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
      >
        {t('clearFilters')}
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile filter button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-20 end-4 z-30 bg-[#1D355E] text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium text-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {t('filters')}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 start-0 h-full w-80 bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t('filters')}</h3>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {content}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 bg-white rounded-2xl shadow-md p-6 h-fit sticky top-24">
        {content}
      </aside>
    </>
  )
}

function ProductsPage() {
  const navigate = useNavigate({ from: '/products' })
  const search = Route.useSearch()
  const { products, categories, getFilteredProducts, getSubcategories, coupons } = useProductStore()
  const lang = getCurrentLang()

  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    category: search.category || null,
    subcategory: null,
    availability: 'all',
    size: null,
  })

  const [searchQuery, setSearchQuery] = useState(search.q || '')

  useEffect(() => {
    if (search.category !== filters.category) {
      setFilters((prev) => ({ ...prev, category: search.category || null, subcategory: null }))
    }
  }, [search.category])

  useEffect(() => {
    if (search.q !== undefined) {
      setSearchQuery(search.q || '')
    }
  }, [search.q])

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.hidden && !c.parent_id),
    [categories],
  )

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>()
    for (const p of products) {
      for (const v of p.variants) {
        if (v.stock > 0) sizeSet.add(v.size)
      }
    }
    return Array.from(sizeSet).sort((a, b) => {
      const na = parseInt(a)
      const nb = parseInt(b)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return a.localeCompare(b)
    })
  }, [products])

  const filteredProducts = useMemo(() => {
    let result = getFilteredProducts(filters)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (p) =>
          p.name_ar.toLowerCase().includes(q) ||
          p.name_en.toLowerCase().includes(q),
      )
    }
    return result
  }, [filters, searchQuery, getFilteredProducts, products])

  const updateURL = useCallback(
    (newFilters: FilterState) => {
      const params: Record<string, string> = {}
      if (newFilters.category) params.category = newFilters.category
      if (searchQuery.trim()) params.q = searchQuery.trim()
      navigate({ search: params, replace: true })
    },
    [searchQuery, navigate],
  )

  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters)
      updateURL(newFilters)
    },
    [updateURL],
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      const params: Record<string, string> = {}
      if (filters.category) params.category = filters.category
      if (value.trim()) params.q = value.trim()
      navigate({ search: params, replace: true })
    },
    [filters.category, navigate],
  )

  const countdownCoupon = coupons.find(
    (c) => c.active && c.show_countdown && c.expires_at && new Date(c.expires_at) > new Date(),
  )

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />

      {countdownCoupon && <CountdownTimer expiresAt={countdownCoupon.expires_at!} />}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header & search */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{t('products')}</h1>
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={`${t('search')}...`}
              className="w-full border rounded-xl px-4 py-3 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
            />
            <svg
              className="absolute top-1/2 -translate-y-1/2 end-3 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex gap-8">
          <FilterSidebar
            filters={filters}
            setFilters={handleFilterChange}
            availableSizes={availableSizes}
            parentCategories={parentCategories}
            getSubcategories={getSubcategories}
          />

          <div className="flex-1 min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg className="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-500 text-lg mb-2">{t('noProducts')}</p>
                <button
                  onClick={() =>
                    handleFilterChange({
                      category: null,
                      subcategory: null,
                      availability: 'all',
                      size: null,
                    })
                  }
                  className="mt-4 px-6 py-2 border-2 border-[#1D355E] text-[#1D355E] rounded-full font-medium hover:bg-[#1D355E] hover:text-white transition-colors"
                >
                  {t('clearFilters')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} onCheckout={() => setCartOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <FAB />
      <PopupModal />
    </>
  )
}
