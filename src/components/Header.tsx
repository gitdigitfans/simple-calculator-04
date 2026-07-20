import { Link, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useProductStore } from '~/stores/products'
import { getCurrentLang, setLang as setLangStore } from '~/lib/translations'
import { t } from '~/lib/translations'

export default function Header({ onCartClick }: { onCartClick: () => void }) {
  const navigate = useNavigate()
  const { session, profile, logout } = useAuthStore()
  const { totalItems } = useCartStore()
  const { categories } = useProductStore()
  const lang = getCurrentLang()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [userDropdown, setUserDropdown] = useState(false)
  const [catDropdown, setCatDropdown] = useState(false)
  const userDropRef = useRef<HTMLDivElement>(null)
  const catDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropRef.current && !userDropRef.current.contains(e.target as Node)) {
        setUserDropdown(false)
      }
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) {
        setCatDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleLang = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar'
    setLangStore(newLang)
    localStorage.setItem('cuteKidsLang', newLang)
    navigate({ to: '.', reload: true })
  }

  const handleLogout = async () => {
    await logout()
    setUserDropdown(false)
    navigate({ to: '/' })
  }

  const topLevelCats = categories.filter((c) => !c.parent_id && !c.hidden)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff'

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-bold text-[#1D355E]">
              {lang === 'ar' ? 'كيوت كيدز' : 'Cute Kids'}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="hover:text-[#F3B423] transition-colors">{t('navHome')}</Link>
            <Link to="/products" className="hover:text-[#F3B423] transition-colors">{t('navProducts')}</Link>

            {/* Categories Dropdown */}
            <div className="relative" ref={catDropRef}>
              <button
                onClick={() => setCatDropdown(!catDropdown)}
                className="flex items-center gap-1 hover:text-[#F3B423] transition-colors"
              >
                {t('categories')}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {catDropdown && (
                <div className="absolute top-full mt-2 bg-white shadow-lg rounded-xl border py-2 min-w-[200px] z-50">
                  {topLevelCats.map((cat) => (
                    <Link
                      key={cat.id}
                      to="/products"
                      search={{ category: cat.slug }}
                      className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                      onClick={() => setCatDropdown(false)}
                    >
                      {lang === 'ar' ? cat.name_ar : cat.name_en}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/about" className="hover:text-[#F3B423] transition-colors">{t('navAbout')}</Link>
            <Link to="/contact" className="hover:text-[#F3B423] transition-colors">{t('navContact')}</Link>
            <Link to="/orders" className="hover:text-[#F3B423] transition-colors">{t('navOrders')}</Link>
            {isAdmin && (
              <Link to="/dashboard" className="hover:text-[#F3B423] transition-colors">{t('navDashboard')}</Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="text-xs font-medium px-2 py-1 rounded border hover:bg-gray-100 transition-colors"
            >
              {t('language')}
            </button>

            {/* Cart */}
            <button onClick={onCartClick} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-6 h-6 text-[#1D355E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {totalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#F3B423] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                  {totalItems()}
                </span>
              )}
            </button>

            {/* Auth */}
            {session ? (
              <div className="relative hidden lg:block" ref={userDropRef}>
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-[#1D355E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium max-w-[100px] truncate">
                    {profile?.full_name || session.user.email}
                  </span>
                </button>
                {userDropdown && (
                  <div className="absolute top-full mt-2 right-0 bg-white shadow-lg rounded-xl border py-2 min-w-[180px] z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm transition-colors"
                      onClick={() => setUserDropdown(false)}
                    >
                      {t('dashboard')}
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 hover:bg-gray-100 text-sm transition-colors"
                        onClick={() => setUserDropdown(false)}
                      >
                        {t('navDashboard')}
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-start px-4 py-2 hover:bg-gray-100 text-sm text-red-600 transition-colors"
                    >
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden lg:inline-flex items-center gap-2 px-4 py-2 bg-[#1D355E] text-white text-sm font-medium rounded-full hover:bg-[#2B4A7A] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {t('signIn')}
              </Link>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t bg-white">
          <nav className="flex flex-col py-4 px-4 gap-1">
            <Link to="/" className="py-3 px-4 rounded-lg hover:bg-gray-100 font-medium" onClick={() => setMobileOpen(false)}>
              {t('navHome')}
            </Link>
            <Link to="/products" className="py-3 px-4 rounded-lg hover:bg-gray-100 font-medium" onClick={() => setMobileOpen(false)}>
              {t('navProducts')}
            </Link>
            <div className="py-3 px-4">
              <p className="font-medium mb-2">{t('categories')}</p>
              <div className="flex flex-col gap-1 pe-4">
                {topLevelCats.map((cat) => (
                  <Link
                    key={cat.id}
                    to="/products"
                    search={{ category: cat.slug }}
                    className="py-2 px-3 rounded-lg hover:bg-gray-100 text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    {lang === 'ar' ? cat.name_ar : cat.name_en}
                  </Link>
                ))}
              </div>
            </div>
            <Link to="/about" className="py-3 px-4 rounded-lg hover:bg-gray-100 font-medium" onClick={() => setMobileOpen(false)}>
              {t('navAbout')}
            </Link>
            <Link to="/contact" className="py-3 px-4 rounded-lg hover:bg-gray-100 font-medium" onClick={() => setMobileOpen(false)}>
              {t('navContact')}
            </Link>
            <Link to="/orders" className="py-3 px-4 rounded-lg hover:bg-gray-100 font-medium" onClick={() => setMobileOpen(false)}>
              {t('navOrders')}
            </Link>
            {isAdmin && (
              <Link to="/dashboard" className="py-3 px-4 rounded-lg hover:bg-gray-100 font-medium" onClick={() => setMobileOpen(false)}>
                {t('navDashboard')}
              </Link>
            )}
            <hr className="my-2" />
            {session ? (
              <>
                <div className="py-3 px-4">
                  <p className="font-medium">{profile?.full_name || session.user.email}</p>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false) }}
                  className="py-3 px-4 rounded-lg hover:bg-gray-100 font-medium text-red-600 text-start"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="py-3 px-4 rounded-lg bg-[#1D355E] text-white font-medium text-center"
                onClick={() => setMobileOpen(false)}
              >
                {t('signIn')}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
