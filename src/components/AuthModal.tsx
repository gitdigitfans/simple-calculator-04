import { useAuthStore } from '~/stores/auth'
import { getCurrentLang, t } from '~/lib/translations'
import { useState } from 'react'

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { login, register } = useAuthStore()
  const lang = getCurrentLang()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setFullName('')
    setPhone('')
    setEmail('')
    setPassword('')
    setError('')
  }

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, fullName, phone)
      }
      resetForm()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 start-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-6">
          {mode === 'login' ? t('signIn') : t('signUp')}
        </h2>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">{t('fullName')}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('password') || 'Password'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F3B423]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1D355E] text-white rounded-xl font-medium hover:bg-[#2B4A7A] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? t('signIn') : t('signUp')}
          </button>
        </form>

        {/* Switch mode */}
        <p className="text-center text-sm mt-4 text-gray-600">
          {mode === 'login' ? (
            <>
              {lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
              <button
                onClick={() => switchMode('register')}
                className="text-[#F3B423] font-semibold hover:underline"
              >
                {t('signUp')}
              </button>
            </>
          ) : (
            <>
              {lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
              <button
                onClick={() => switchMode('login')}
                className="text-[#F3B423] font-semibold hover:underline"
              >
                {t('signIn')}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
