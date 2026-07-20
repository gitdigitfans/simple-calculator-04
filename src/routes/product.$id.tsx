import { createFileRoute, Link } from '@tanstack/react-router'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import CartDrawer from '~/components/CartDrawer'
import AuthModal from '~/components/AuthModal'
import FAB from '~/components/FAB'
import ProductCard from '~/components/ProductCard'
import { useProductStore } from '~/stores/products'
import { useCartStore } from '~/stores/cart'
import { getCurrentLang, t } from '~/lib/translations'
import { useState, useMemo } from 'react'
import type { Product } from '~/lib/types'

export const Route = createFileRoute('/product/$id')({
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { id } = Route.useParams()
  const { products, categories } = useProductStore()
  const { addItem } = useCartStore()
  const lang = getCurrentLang()

  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const product = useMemo(
    () => products.find((p) => String(p.id) === String(id)),
    [products, id],
  )

  const relatedProducts = useMemo(() => {
    if (!product) return []
    return products
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4)
  }, [products, product])

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header onCartClick={() => setCartOpen(true)} />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {lang === 'ar' ? 'المنتج غير موجود' : 'Product Not Found'}
            </h1>
            <p className="text-gray-500 mb-6">
              {lang === 'ar' ? 'المنتج الذي تبحث عنه غير موجود أو تم حذفه' : 'The product you are looking for does not exist or has been removed.'}
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

  const name = lang === 'ar' ? product.name_ar : product.name_en
  const description = lang === 'ar' ? product.description_ar : product.description_en
  const category = categories.find((c) => c.slug === product.category)
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
  const availableSizes = product.variants.filter((v) => v.stock > 0)
  const images = product.images && product.images.length > 0 ? product.images : []
  const selectedVariant = product.variants.find((v) => v.size === selectedSize)
  const selectedStock = selectedVariant?.stock ?? 0

  const handleAddToCart = () => {
    if (!selectedSize || selectedStock <= 0) return
    addItem({
      productId: product.id,
      size: selectedSize,
      quantity,
      price: product.price,
      name_ar: product.name_ar,
      name_en: product.name_en,
      category: product.category || '',
      image: product.images[0] || '',
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleCheckout = () => {
    setCartOpen(false)
    window.location.href = '/checkout'
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartClick={() => setCartOpen(true)} />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-[#1D355E] transition-colors">{t('home')}</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-[#1D355E] transition-colors">{t('navProducts')}</Link>
          {category && (
            <>
              <span>/</span>
              <span className="text-gray-800">
                {lang === 'ar' ? category.name_ar : category.name_en}
              </span>
            </>
          )}
        </nav>

        {/* Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Image Gallery */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100 mb-4">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[selectedImage]}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                  {selectedStock <= 0 && totalStock === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-white/90 text-gray-800 font-bold px-6 py-3 rounded-full text-lg">
                        {t('outOfStock')}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute top-1/2 start-3 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute top-1/2 end-3 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                      selectedImage === idx
                        ? 'border-[#1D355E]'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Category badge */}
            {category && (
              <span className="inline-block bg-[#1D355E]/10 text-[#1D355E] text-xs font-medium px-3 py-1 rounded-full mb-3">
                {lang === 'ar' ? category.name_ar : category.name_en}
              </span>
            )}

            {/* Name */}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">{name}</h1>

            {/* Price */}
            <p className="text-3xl font-bold text-[#1D355E] mb-4">
              {product.price} <span className="text-lg">{t('egp')}</span>
            </p>

            {/* Description */}
            {description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('productDetails')}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{description}</p>
              </div>
            )}

            {/* Size Selector */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('selectSize')}</h3>
              {availableSizes.length === 0 && totalStock === 0 ? (
                <p className="text-red-500 font-medium">{t('outOfStock')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const isOOS = v.stock <= 0
                    const isSelected = selectedSize === v.size
                    const isLow = v.stock > 0 && v.stock <= 5
                    return (
                      <button
                        key={v.size}
                        onClick={() => {
                          if (!isOOS) {
                            setSelectedSize(v.size)
                            setQuantity(1)
                          }
                        }}
                        disabled={isOOS}
                        className={`relative px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                          isOOS
                            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                            : isSelected
                              ? 'border-[#1D355E] bg-[#1D355E] text-white'
                              : 'border-gray-200 bg-white text-gray-800 hover:border-[#1D355E]'
                        }`}
                      >
                        {v.size}
                        {!isOOS && isLow && (
                          <span className="absolute -top-2 -end-2 bg-[#F3B423] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {v.stock} {t('stockLeft')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            {selectedSize && selectedStock > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('quantity')}</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-lg font-bold hover:border-[#1D355E] transition-colors"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold w-10 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(selectedStock, q + 1))}
                    className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-lg font-bold hover:border-[#1D355E] transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Add to Cart */}
            {totalStock > 0 ? (
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || selectedStock <= 0}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  added
                    ? 'bg-[#10B981] text-white'
                    : 'bg-[#1D355E] text-white hover:bg-[#2B4A7A] disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {added
                  ? (lang === 'ar' ? 'تمت الإضافة!' : 'Added!')
                  : !selectedSize
                    ? t('selectSize')
                    : selectedStock <= 0
                      ? t('outOfStock')
                      : t('addToCart')}
              </button>
            ) : (
              <div className="w-full py-4 rounded-xl bg-gray-200 text-gray-500 font-bold text-lg text-center">
                {t('outOfStock')}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {lang === 'ar' ? 'منتجات مشابهة' : 'Related Products'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
      />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <FAB />
    </div>
  )
}
