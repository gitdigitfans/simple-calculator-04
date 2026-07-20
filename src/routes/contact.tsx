import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { t, getCurrentLang } from '~/lib/translations'
import { CONFIG } from '~/lib/config'
import Header from '~/components/Header'
import Footer from '~/components/Footer'
import CartDrawer from '~/components/CartDrawer'
import AuthModal from '~/components/AuthModal'
import FAB from '~/components/FAB'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function ContactPage() {
  const lang = getCurrentLang()
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'general',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
    setForm({ name: '', email: '', phone: '', subject: 'general', message: '' })
  }

  const contactCards = [
    {
      icon: '📞',
      title: lang === 'ar' ? 'الهاتف' : 'Phone',
      value: CONFIG.phone || '+20 100 000 0000',
      link: `tel:${CONFIG.phone || '+201000000000'}`,
    },
    {
      icon: '✉️',
      title: lang === 'ar' ? 'البريد الإلكتروني' : 'Email',
      value: CONFIG.email || 'info@cutekids.com',
      link: `mailto:${CONFIG.email || 'info@cutekids.com'}`,
    },
    {
      icon: '📍',
      title: lang === 'ar' ? 'العنوان' : 'Address',
      value: lang === 'ar' ? 'مصر، القاهرة' : 'Cairo, Egypt',
      link: null,
    },
    {
      icon: '🕐',
      title: lang === 'ar' ? 'ساعات العمل' : 'Working Hours',
      value: lang === 'ar' ? 'السبت - الخميس: 10 ص - 10 م' : 'Sat - Thu: 10AM - 10PM',
      link: null,
    },
  ]

  const subjectOptions = [
    { value: 'general', label: lang === 'ar' ? 'استفسار عام' : 'General Inquiry' },
    { value: 'order', label: lang === 'ar' ? 'سؤال عن طلب' : 'Order Question' },
    { value: 'return', label: lang === 'ar' ? 'استبدال أو إرجاع' : 'Return / Exchange' },
    { value: 'complaint', label: lang === 'ar' ? 'شكوى' : 'Complaint' },
    { value: 'other', label: lang === 'ar' ? 'أخرى' : 'Other' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#4158D0] via-[#C850C0] to-[#FF6B9D] text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('contact')}</h1>
            <p className="text-lg text-white/90">
              {lang === 'ar' ? 'يسعدنا تواصلك معنا' : 'We would love to hear from you'}
            </p>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactCards.map((card, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm text-center hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="font-bold text-[#1D355E] mb-1">{card.title}</h3>
                {card.link ? (
                  <a href={card.link} className="text-gray-600 text-sm hover:text-[#FF6B9D] transition-colors">
                    {card.value}
                  </a>
                ) : (
                  <p className="text-gray-600 text-sm">{card.value}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact Form + Map */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#1D355E] mb-6">
                {lang === 'ar' ? 'أرسل لنا رسالة' : 'Send Us a Message'}
              </h2>

              {submitted && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 text-center font-medium">
                  {lang === 'ar'
                    ? 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.'
                    : 'Your message has been sent successfully! We will get back to you soon.'}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'ar' ? 'الموضوع' : 'Subject'}
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent bg-white"
                  >
                    {subjectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'ar' ? 'الرسالة' : 'Message'}
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#FF6B9D] to-[#C850C0] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  {lang === 'ar' ? 'إرسال' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Map Placeholder */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="bg-gradient-to-br from-gray-200 to-gray-300 flex-1 min-h-[300px] flex items-center justify-center rounded-2xl m-4">
                <div className="text-center text-gray-500">
                  <div className="text-5xl mb-4">🗺️</div>
                  <p className="font-medium">
                    {lang === 'ar' ? 'خريطة الموقع' : 'Location Map'}
                  </p>
                  <p className="text-sm mt-1">
                    {lang === 'ar' ? 'مصر، القاهرة' : 'Cairo, Egypt'}
                  </p>
                </div>
              </div>

              {/* Social Media */}
              <div className="p-6 border-t">
                <h3 className="font-bold text-[#1D355E] mb-4 text-center">
                  {lang === 'ar' ? 'تابعنا على' : 'Follow Us On'}
                </h3>
                <div className="flex justify-center gap-4">
                  <a
                    href="#"
                    className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors text-xl"
                  >
                    f
                  </a>
                  <a
                    href="#"
                    className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity text-xl"
                  >
                    📷
                  </a>
                  <a
                    href="#"
                    className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors text-xl"
                  >
                    💬
                  </a>
                  <a
                    href="#"
                    className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-opacity text-xl"
                  >
                    ▶
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FAB />
    </div>
  )
}
