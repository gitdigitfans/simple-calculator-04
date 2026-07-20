import { useNavigate } from '@tanstack/react-router'
import { useCartStore } from '~/stores/cart'
import { useProductStore } from '~/stores/products'
import { getCurrentLang, t } from '~/lib/translations'
import type { Product } from '~/lib/types'
import { useState } from 'react'

export default function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const { addItem } = useCartStore()
  const { categories } = useProductStore()
  const lang = getCurrentLang()

  const name = lang === 'ar' ? product.name_ar : product.name_en
  const category = categories.find((c) => c.slug === product.category)
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
  const availableSizes = product.variants.filter((v) => v.stock > 0)

  const [selectedSize, setSelectedSize] = useState(
    availableSizes.length > 0 ? availableSizes[0].size : '',
  )
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedSize || totalStock === 0) return
    addItem({
      productId: product.id,
      size: selectedSize,
      quantity: 1,
      price: product.price,
      name_ar: product.name_ar,
      name_en: product.name_en,
      category: product.category || '',
      image: product.images[0] || '',
    })
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-md overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow"
      onClick={() => navigate({ to: '/product/$id', params: { id: String(product.id) } })}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.images[0] || ''}
          alt={name}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {/* Category badge */}
        {category && (
          <span className="absolute top-3 start-3 bg-[#1D355E]/90 text-white text-xs px-2.5 py-1 rounded-full">
            {lang === 'ar' ? category.name_ar : category.name_en}
          </span>
        )}

        {/* Out of stock overlay */}
        {totalStock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white/90 text-gray-800 font-bold px-4 py-2 rounded-full text-sm">
              {t('outOfStock')}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 truncate mb-1">{name}</h3>

        <p className="text-lg font-bold text-[#1D355E] mb-3">
          {product.price} {t('egp')}
        </p>

        {/* Size selector */}
        {totalStock > 0 && (
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">{t('selectSize')}</label>
            <select
              value={selectedSize}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedSize(e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
            >
              {availableSizes.map((v) => (
                <option key={v.size} value={v.size}>
                  {v.size} ({v.stock} {t('available')})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={totalStock === 0 || !selectedSize}
          className="w-full py-2 bg-[#1D355E] text-white rounded-xl font-medium text-sm hover:bg-[#2B4A7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {totalStock === 0 ? t('outOfStock') : t('addToCart')}
        </button>
      </div>
    </div>
  )
}
