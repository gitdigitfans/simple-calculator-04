import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t, getCurrentLang } from '~/lib/translations'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import CartDrawer from '~/components/CartDrawer'
import AuthModal from '~/components/AuthModal'
import FAB from '~/components/FAB'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  const lang = getCurrentLang()
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const features = [
    {
      icon: '✨',
      title: t('quality'),
      desc: t('qualityDesc'),
    },
    {
      icon: '🔄',
      title: t('easyReturns'),
      desc: t('returnsDesc'),
    },
    {
      icon: '💰',
      title: t('payment'),
      desc: t('paymentDesc'),
    },
    {
      icon: '💬',
      title: lang === 'ar' ? 'تواصل مستمر' : 'Constant Support',
      desc: lang === 'ar' ? 'فريق خدمة العملاء متاح لمساعدتك' : 'Our support team is always ready to help',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#FF6B9D] via-[#C850C0] to-[#4158D0] text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('aboutTitle')}</h1>
            <p className="text-lg md:text-xl text-white/90">{t('aboutSubtitle')}</p>
          </div>
        </section>

        {/* Content Sections */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <div className="space-y-12">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#1D355E] mb-4">
                {lang === 'ar' ? 'قصتنا' : 'Our Story'}
              </h2>
              <p className="text-gray-600 leading-relaxed text-lg">{t('aboutText1')}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#1D355E] mb-4">
                {lang === 'ar' ? 'رسالتنا' : 'Our Mission'}
              </h2>
              <p className="text-gray-600 leading-relaxed text-lg">{t('aboutText2')}</p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-[#1D355E] mb-12">
              {lang === 'ar' ? 'لماذا تختارنا؟' : 'Why Choose Us?'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-bold text-[#1D355E] text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1D355E] mb-8">
            {lang === 'ar' ? 'فريقنا' : 'Our Team'}
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-[#FF6B9D] to-[#C850C0] rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-5xl text-white">👶</span>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
              {lang === 'ar'
                ? 'فريق شغوف من المتخصصين في مجال ملابس الأطفال يعمل بشغف لتقديم أفضل المنتجات وأرقى الخدمات لعملائنا الكرام.'
                : 'A passionate team of children fashion specialists working dedicatedly to deliver the best products and finest services to our valued customers.'}
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="bg-gradient-to-r from-[#1D355E] to-[#2A5298] py-16 px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              {lang === 'ar' ? 'تواصل معنا' : 'Get In Touch'}
            </h2>
            <p className="text-white/80 text-lg mb-8">
              {lang === 'ar'
                ? 'يسعدنا تواصلك معنا لأي استفسار أو ملاحظة'
                : 'We are happy to hear from you for any inquiry or feedback'}
            </p>
            <Link
              to="/contact"
              className="inline-block bg-white text-[#1D355E] font-bold py-3 px-8 rounded-full hover:bg-gray-100 transition-colors"
            >
              {t('contact')}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <FAB />
    </div>
  )
}
