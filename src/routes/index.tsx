import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useProductStore } from '~/stores/products'
import { useSettingsStore } from '~/stores/settings'
import { getCurrentLang, t } from '~/lib/translations'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import CartDrawer from '~/components/CartDrawer'
import AuthModal from '~/components/AuthModal'
import FAB from '~/components/FAB'
import PopupModal from '~/components/PopupModal'
import ProductCard from '~/components/ProductCard'

export const Route = createFileRoute('/')({
  component: HomePage,
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

function HeroSection() {
  const { heroSlides } = useSettingsStore()
  const lang = getCurrentLang()
  const [currentSlide, setCurrentSlide] = useState(0)

  const activeSlides = heroSlides.filter((s) => s.active !== false)

  useEffect(() => {
    if (activeSlides.length <= 1) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [activeSlides.length])

  if (activeSlides.length === 0) {
    return (
      <section className="relative bg-gradient-to-br from-[#1D355E] via-[#2B4A7A] to-[#1D355E] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 end-10 w-72 h-72 bg-[#F3B423] rounded-full blur-3xl" />
          <div className="absolute bottom-10 start-10 w-96 h-96 bg-[#F3B423] rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-24 md:py-36 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            {t('heroSubtitle')}
          </p>
          <Link
            to="/products"
            className="inline-block px-8 py-3 bg-[#F3B423] text-white rounded-full font-bold text-lg hover:bg-[#D49A1A] transition-colors shadow-lg"
          >
            {t('shopNow')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[400px] md:h-[500px] lg:h-[600px]">
        {activeSlides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={lang === 'ar' ? slide.title_ar : slide.title_en}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center text-center text-white px-4">
              <div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 drop-shadow-lg">
                  {lang === 'ar' ? slide.title_ar : slide.title_en}
                </h1>
                {(lang === 'ar' ? slide.subtitle_ar : slide.subtitle_en) && (
                  <p className="text-lg md:text-xl text-gray-200 mb-6 max-w-xl mx-auto drop-shadow">
                    {lang === 'ar' ? slide.subtitle_ar : slide.subtitle_en}
                  </p>
                )}
                <Link
                  to="/products"
                  className="inline-block px-8 py-3 bg-[#F3B423] text-white rounded-full font-bold text-lg hover:bg-[#D49A1A] transition-colors shadow-lg"
                >
                  {t('shopNow')}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      {activeSlides.length > 1 && (
        <div className="absolute bottom-6 start-0 end-0 flex justify-center gap-2 z-10">
          {activeSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === currentSlide ? 'bg-[#F3B423]' : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function FeaturedCategories() {
  const { categories } = useProductStore()
  const lang = getCurrentLang()
  const parentCategories = categories.filter((c) => !c.hidden && !c.parent_id)

  if (parentCategories.length === 0) return null

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{t('browseCategories')}</h2>
          <p className="text-gray-500">{t('categoriesDesc')}</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {parentCategories.map((cat) => (
            <Link
              key={cat.id}
              to="/products"
              search={{ category: cat.slug }}
              className="shrink-0 w-36 md:w-44 group"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-square mb-3 shadow-md group-hover:shadow-xl transition-shadow">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={lang === 'ar' ? cat.name_ar : cat.name_en}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1D355E] to-[#2B4A7A] flex items-center justify-center">
                    <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-3 start-3 text-white font-bold text-sm md:text-base">
                  {lang === 'ar' ? cat.name_ar : cat.name_en}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedProducts() {
  const { products } = useProductStore()
  const lang = getCurrentLang()
  const featured = products.slice(0, 8)

  if (featured.length === 0) return null

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{t('featuredProducts')}</h2>
          <p className="text-gray-500">{t('productsDesc')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            to="/products"
            className="inline-block px-8 py-3 border-2 border-[#1D355E] text-[#1D355E] rounded-full font-bold hover:bg-[#1D355E] hover:text-white transition-colors"
          >
            {t('viewAllProducts')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  const lang = getCurrentLang()

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">{t('aboutTitle')}</h2>
        <p className="text-gray-600 leading-relaxed mb-4 text-lg">
          {t('aboutText1')}
        </p>
        <p className="text-gray-600 leading-relaxed mb-6 text-lg">
          {t('aboutText2')}
        </p>
        <Link
          to="/about"
          className="inline-block px-6 py-2 text-[#1D355E] font-semibold hover:text-[#F3B423] transition-colors border-b-2 border-[#1D355E] hover:border-[#F3B423]"
        >
          {t('readMore')}
        </Link>
      </div>
    </section>
  )
}

function WhyChooseUs() {
  const lang = getCurrentLang()

  const features = [
    { icon: '🛒', title: t('why1'), desc: t('why1Desc') },
    { icon: '💳', title: t('why2'), desc: t('why2Desc') },
    { icon: '📞', title: t('why3'), desc: t('why3Desc') },
    { icon: '🏷️', title: t('why4'), desc: t('why4Desc') },
  ]

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-10">{t('whyTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow text-center">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AppFeatures() {
  const features = [
    { icon: '✨', title: t('quality'), desc: t('qualityDesc') },
    { icon: '🔄', title: t('easyReturns'), desc: t('returnsDesc') },
    { icon: '💰', title: t('payment'), desc: t('paymentDesc') },
  ]

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-4 p-6 rounded-2xl bg-gray-50">
              <div className="text-3xl shrink-0">{f.icon}</div>
              <div>
                <h3 className="font-bold text-gray-800 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HomePage() {
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { coupons } = useProductStore()
  const lang = getCurrentLang()

  const handleCheckout = useCallback(() => {
    setCartOpen(false)
  }, [])

  const countdownCoupon = coupons.find(
    (c) => c.active && c.show_countdown && c.expires_at && new Date(c.expires_at) > new Date(),
  )

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />

      {countdownCoupon && <CountdownTimer expiresAt={countdownCoupon.expires_at!} />}

      <HeroSection />
      <FeaturedCategories />
      <FeaturedProducts />
      <AboutSection />
      <WhyChooseUs />
      <AppFeatures />

      <Footer />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <FAB />
      <PopupModal />
    </>
  )
}
