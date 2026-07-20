import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '~/stores/auth'
import { useProductStore } from '~/stores/products'
import { useOrderStore } from '~/stores/orders'
import { useSettingsStore } from '~/stores/settings'
import { getCurrentLang } from '~/lib/translations'
import { CONFIG } from '~/lib/config'
import {
  createProduct, updateProduct, deleteProduct,
  createCategory, updateCategory, deleteCategoryDb,
  createCoupon, updateCoupon, deleteCouponDb,
  updateOrderStatus, updateOrder,
  fetchProfiles,
  createStaffAccount, updateProfileRole,
} from '~/lib/supabase'
import { uploadToR2 } from '~/lib/r2'
import { useState, useEffect, useCallback } from 'react'
import type { Product, Category, Coupon, Order, Profile } from '~/lib/types'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

type AdminPageType = 'dashboard' | 'products' | 'categories' | 'coupons' | 'orders' | 'popup' | 'hero' | 'fab' | 'staff'

function AdminPage() {
  const navigate = useNavigate()
  const { session, profile, loading: authLoading } = useAuthStore()
  const { products, categories, coupons, init: initProducts, refreshProducts } = useProductStore()
  const { orders, loadAllOrders, updateStatus } = useOrderStore()
  const { heroSlides, popup, fab, loadHeroSlides, saveHeroSlides, loadPopup, savePopup, loadFab, saveFab } = useSettingsStore()

  const [currentAdminPage, setCurrentAdminPage] = useState<AdminPageType>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!session?.user) {
      navigate({ to: '/' })
      return
    }
    const role = profile?.role
    if (role === 'admin' || role === 'staff') {
      setAuthorized(true)
      if (role === 'staff') setCurrentAdminPage('products')
    } else if (session.user.email?.toLowerCase() === 'admin@gmail.com') {
      setAuthorized(true)
    } else {
      navigate({ to: '/' })
    }
  }, [authLoading, session, profile, navigate])

  useEffect(() => {
    if (authorized) {
      initProducts()
      loadAllOrders()
      loadHeroSlides()
      loadPopup()
      loadFab()
    }
  }, [authorized])

  const handleNavPage = useCallback((page: AdminPageType) => {
    if (profile?.role === 'staff' && page === 'dashboard') page = 'products'
    setCurrentAdminPage(page)
    setMobileMenuOpen(false)
  }, [profile])

  if (authLoading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F3B423] border-t-[#1D355E] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex h-screen">
      <Sidebar currentAdminPage={currentAdminPage} onNavigate={handleNavPage} isAdmin={isAdmin} />

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#1D355E] text-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold">القائمة</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-1">
              {navItems.filter(item => item.id !== 'staff' || isAdmin).map(item => (
                <button key={item.id} onClick={() => handleNavPage(item.id as AdminPageType)}
                  className="w-full text-right px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 hover:bg-white/10 transition">
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
            <hr className="my-4 border-white/10" />
            <a href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              العودة للمتجر
            </a>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="md:hidden fixed top-0 left-0 right-0 bg-[#1D355E] text-white z-40 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">لوحة التحكم</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <div className="p-4 md:p-8">
          <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
            {navItems.filter(item => item.id !== 'staff' || isAdmin).map(item => (
              <button key={item.id} onClick={() => handleNavPage(item.id as AdminPageType)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap flex items-center gap-1 transition ${
                  currentAdminPage === item.id
                    ? 'bg-[#1D355E] text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                {item.icon} {item.shortLabel}
              </button>
            ))}
          </div>

          {currentAdminPage === 'dashboard' && (
            <DashboardPage products={products} orders={orders} />
          )}
          {currentAdminPage === 'products' && (
            <ProductsPage products={products} categories={categories} onRefresh={refreshProducts} />
          )}
          {currentAdminPage === 'categories' && (
            <CategoriesPage categories={categories} onRefresh={initProducts} />
          )}
          {currentAdminPage === 'coupons' && (
            <CouponsPage coupons={coupons} categories={categories} onRefresh={initProducts} />
          )}
          {currentAdminPage === 'orders' && (
            <OrdersPage orders={orders} products={products} onRefresh={loadAllOrders} updateStatus={updateStatus} />
          )}
          {currentAdminPage === 'popup' && (
            <PopupPage popup={popup} onSave={savePopup} />
          )}
          {currentAdminPage === 'hero' && (
            <HeroPage slides={heroSlides} onSave={saveHeroSlides} />
          )}
          {currentAdminPage === 'fab' && (
            <FabPage fab={fab} onSave={saveFab} />
          )}
          {currentAdminPage === 'staff' && isAdmin && (
            <StaffPage />
          )}
        </div>
      </main>
    </div>
  )
}

const navItems = [
  { id: 'dashboard', label: 'لوحة المعلومات', shortLabel: 'معلومات', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  { id: 'products', label: 'المنتجات', shortLabel: 'منتجات', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> },
  { id: 'coupons', label: 'الكوبونات والعروض', shortLabel: 'كوبونات', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> },
  { id: 'categories', label: 'التصنيفات', shortLabel: 'تصنيفات', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
  { id: 'orders', label: 'الطلبات', shortLabel: 'طلبات', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
  { id: 'popup', label: 'الإعلان المنبثق', shortLabel: 'منبثق', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { id: 'hero', label: 'السلايدر الرئيسي', shortLabel: 'سلايدر', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  { id: 'fab', label: 'زر الاتصال العائم', shortLabel: 'اتصال', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> },
  { id: 'staff', label: 'إدارة الموظفين', shortLabel: 'موظفين', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg> },
]

function Sidebar({ currentAdminPage, onNavigate, isAdmin }: { currentAdminPage: string; onNavigate: (p: AdminPageType) => void; isAdmin: boolean }) {
  const pendingCount = useOrderStore(s => s.orders.filter(o => o.status === 'pending').length)

  return (
    <aside className="w-64 bg-[#1D355E] text-white flex-shrink-0 hidden md:block relative">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">Cute Kids</span>
        </div>
        <span className="text-xs text-gray-400 mt-1 block">لوحة التحكم</span>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.filter(item => item.id !== 'staff' || isAdmin).map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id as AdminPageType)}
            className={`w-full text-right px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition ${
              currentAdminPage === item.id ? 'bg-white/10' : 'hover:bg-white/10'
            }`}>
            {item.icon}
            {item.label}
            {item.id === 'orders' && pendingCount > 0 && (
              <span className="mr-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="absolute bottom-0 w-64 p-4 border-t border-white/10">
        <a href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          العودة للمتجر
        </a>
      </div>
    </aside>
  )
}

function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} p-6 relative max-h-[85vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-xl transition">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-xl font-bold text-[#1D355E] mb-6">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input {...props} className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none ${props.className || ''}`} />
    </div>
  )
}

function TextareaField({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea {...props} className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none ${props.className || ''}`} />
    </div>
  )
}

function SelectField({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <select {...props} className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] outline-none bg-white ${props.className || ''}`}>
        {children}
      </select>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-extrabold text-[#1D355E] mb-6">{children}</h1>
}

function PrimaryButton({ onClick, children, className = '' }: { onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition flex items-center gap-2 ${className}`}>
      {children}
    </button>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
      {active ? 'مفعل' : 'معطل'}
    </span>
  )
}

function ConfirmButton({ onClick, color, children }: { onClick: () => void; color: 'red' | 'green' | 'blue'; children: React.ReactNode }) {
  const colors = {
    red: 'bg-red-50 text-red-500 hover:bg-red-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  }
  return (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${colors[color]}`}>
      {children}
    </button>
  )
}

function ImageUploader({ currentUrl, prefix, onUpload, onRemove }: { currentUrl: string; prefix: string; onUpload: (url: string) => void; onRemove: () => void }) {
  const [uploading, setUploading] = useState(false)
  const handleUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        setUploading(true)
        const key = prefix + '_' + Date.now()
        const url = await uploadToR2(file, key)
        onUpload(url)
      } catch (err: any) {
        alert('خطأ في رفع الصورة: ' + err.message)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50 flex items-center justify-center">
        {currentUrl ? <img src={currentUrl} className="w-full h-full object-cover" alt="" /> : (
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button type="button" onClick={handleUpload} disabled={uploading}
          className="px-3 py-1.5 text-xs font-semibold bg-[#1D355E]/10 text-[#1D355E] rounded-lg hover:bg-[#1D355E]/20 transition whitespace-nowrap disabled:opacity-50">
          {uploading ? 'جاري الرفع...' : 'اختيار صورة'}
        </button>
        {currentUrl && (
          <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-600 font-semibold transition">
            حذف
          </button>
        )}
      </div>
    </div>
  )
}

function GalleryUploader({ images, prefix, onChange }: { images: string[]; prefix: string; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const handleAdd = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        setUploading(true)
        const key = prefix + '_gal_' + Date.now()
        const url = await uploadToR2(file, key)
        onChange([...images, url])
      } catch (err: any) {
        alert('خطأ في رفع الصورة: ' + err.message)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <img src={url} className="w-full h-full object-cover" alt="" />
            <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              &times;
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={handleAdd} disabled={uploading}
        className="px-4 py-2 text-xs font-semibold bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition disabled:opacity-50">
        {uploading ? 'جاري الرفع...' : '+ إضافة صورة'}
      </button>
    </div>
  )
}

function getAllProductSizes(products: Product[]): string[] {
  const sizeSet = new Set<string>()
  for (const p of products) {
    for (const v of (p.variants || [])) sizeSet.add(v.size)
  }
  for (const s of CONFIG.sizes) sizeSet.add(s)
  return [...sizeSet].sort((a, b) => {
    const an = Number(a), bn = Number(b)
    if (!isNaN(an) && !isNaN(bn)) return an - bn
    return a.localeCompare(b)
  })
}

function formatExpiry(expiresAt?: string) {
  if (!expiresAt) return <span className="text-gray-400">—</span>
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return <span className="text-red-500 font-semibold">منتهي</span>
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return <span className="text-gray-600">{days} يوم {hours} س</span>
  return <span className="text-[#F3B423] font-semibold">أقل من يوم</span>
}

function getTotalStock(product: Product): number {
  return (product.variants || []).reduce((s, v) => s + v.stock, 0)
}

function parseConditions(conditions: Coupon['conditions']): Record<string, any> {
  if (typeof conditions === 'string') {
    try { return JSON.parse(conditions) } catch { return {} }
  }
  return (conditions as Record<string, any>) || {}
}

const statusLabels: Record<string, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'تم التأكيد',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
}

const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered']

// ========================= DASHBOARD =========================
function DashboardPage({ products, orders }: { products: Product[]; orders: Order[] }) {
  const totalProducts = products.length
  const totalStock = products.reduce((s, p) => s + getTotalStock(p), 0)
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending')
  const lowStock = products.filter(p => p.variants.some(v => v.stock > 0 && v.stock <= 3))

  return (
    <div>
      <SectionTitle>لوحة المعلومات</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👕" value={totalProducts} label="إجمالي المنتجات" />
        <StatCard icon="📦" value={totalStock} label="إجمالي المخزون" />
        <StatCard icon="📋" value={totalOrders} label="إجمالي الطلبات" />
        <StatCard icon="💰" value={`${totalRevenue} ج`} label="إجمالي الإيرادات" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1D355E] mb-4">طلبات معلقة ({pendingOrders.length})</h3>
          {pendingOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">لا توجد طلبات معلقة</p>
          ) : (
            pendingOrders.slice(0, 5).map(o => (
              <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-semibold text-sm">#{o.id}</span>
                  <span className="text-xs text-gray-500 mr-2">{o.customer_name}</span>
                </div>
                <span className="text-sm font-bold text-[#F3B423]">{o.total} ج</span>
              </div>
            ))
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1D355E] mb-4">منتجات أوشكت على النفاد</h3>
          {lowStock.length === 0 ? (
            <p className="text-gray-500 text-sm">جميع المنتجات متوفرة</p>
          ) : (
            lowStock.slice(0, 5).map(p => {
              const low = p.variants.filter(v => v.stock > 0 && v.stock <= 3)
              return (
                <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-semibold text-sm">{p.name_ar}</span>
                    <span className="text-xs text-gray-500 mr-2">{low.map(v => v.size + '(' + v.stock + ')').join('، ')}</span>
                  </div>
                  <span className="text-sm font-bold text-red-500">{low.reduce((s, v) => s + v.stock, 0)}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-extrabold text-[#1D355E]">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}

// ========================= PRODUCTS =========================
function ProductsPage({ products, categories, onRefresh }: { products: Product[]; categories: Category[]; onRefresh: () => Promise<void> }) {
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    try {
      await deleteProduct(id)
      await onRefresh()
    } catch (err: any) {
      alert('خطأ في حذف المنتج: ' + err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionTitle>إدارة المنتجات</SectionTitle>
        <PrimaryButton onClick={() => { setEditProduct(null); setModalOpen(true) }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة منتج
        </PrimaryButton>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs font-semibold">
                <th className="text-right p-3">المنتج</th>
                <th className="text-right p-3">القسم</th>
                <th className="text-right p-3">السعر</th>
                <th className="text-right p-3">المخزون</th>
                <th className="text-right p-3">المقاسات</th>
                <th className="text-center p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const totalStock = getTotalStock(p)
                const sizes = p.variants.map(v => `${v.size} (${v.stock})`).join('، ')
                const cat = categories.find(c => String(c.slug) === String(p.category))
                return (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          <img src={p.images?.[0] || ''} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#1D355E]">{p.name_ar}</div>
                          <div className="text-xs text-gray-400">{p.name_en}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">{cat ? cat.name_ar : '-'}</td>
                    <td className="p-3 font-bold text-[#F3B423]">{p.price} ج</td>
                    <td className="p-3">
                      <span className={`font-semibold ${totalStock === 0 ? 'text-red-500' : totalStock <= 10 ? 'text-[#F3B423]' : 'text-green-500'}`}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate" title={sizes}>{sizes}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ConfirmButton onClick={() => { setEditProduct(p); setModalOpen(true) }} color="blue">تعديل</ConfirmButton>
                        <ConfirmButton onClick={() => handleDelete(p.id)} color="red">حذف</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ProductModal open={modalOpen} onClose={() => { setModalOpen(false); setEditProduct(null) }} product={editProduct} categories={categories} onRefresh={onRefresh} />
    </div>
  )
}

function ProductModal({ open, onClose, product, categories, onRefresh }: { open: boolean; onClose: () => void; product: Product | null; categories: Category[]; onRefresh: () => Promise<void> }) {
  const [nameAr, setNameAr] = useState(product?.name_ar || '')
  const [nameEn, setNameEn] = useState(product?.name_en || '')
  const [descAr, setDescAr] = useState(product?.description_ar || '')
  const [descEn, setDescEn] = useState(product?.description_en || '')
  const [categoryId, setCategoryId] = useState(product?.category_id || categories[0]?.id || '')
  const [price, setPrice] = useState(product?.price?.toString() || '')
  const [mainImage, setMainImage] = useState(product?.images?.[0] || '')
  const [gallery, setGallery] = useState<string[]>(product?.images?.slice(1) || [])
  const [customSizes, setCustomSizes] = useState(product?.custom_sizes || '')
  const [warehouses, setWarehouses] = useState<any[]>(() => {
    if (product?.warehouses && product.warehouses.length > 0) return JSON.parse(JSON.stringify(product.warehouses))
    const variants = product?.variants || []
    return [{ name: 'المخزن الرئيسي', items: variants.map((v: any) => ({ size: v.size, stock: v.stock || 0 })) }]
  })
  const [saving, setSaving] = useState(false)

  const sizes = customSizes.split(',').map(s => s.trim()).filter(Boolean)

  const syncWarehouses = (newSizes: string[]) => {
    setWarehouses(prev => {
      if (prev.length === 0) return [{ name: 'المخزن الرئيسي', items: newSizes.map(s => ({ size: s, stock: 0 })) }]
      return prev.map(wh => {
        const map: Record<string, number> = {}
        for (const item of wh.items) map[item.size] = item.stock
        return { name: wh.name, items: newSizes.map(s => ({ size: s, stock: map[s] || 0 })) }
      })
    })
  }

  const handleCustomSizesChange = (val: string) => {
    setCustomSizes(val)
    const newSizes = val.split(',').map(s => s.trim()).filter(Boolean)
    syncWarehouses(newSizes)
  }

  const addWarehouse = () => {
    const items = sizes.map(s => ({ size: s, stock: 0 }))
    setWarehouses(prev => [...prev, { name: 'مستودع فرعي', items }])
  }

  const removeWarehouse = (idx: number) => {
    if (idx === 0) return
    setWarehouses(prev => prev.filter((_, i) => i !== idx))
  }

  const updateWarehouseName = (idx: number, name: string) => {
    setWarehouses(prev => prev.map((wh, i) => i === idx ? { ...wh, name } : wh))
  }

  const updateWarehouseStock = (whIdx: number, size: string, stock: number) => {
    setWarehouses(prev => prev.map((wh, i) => i === whIdx ? { ...wh, items: wh.items.map(item => item.size === size ? { ...item, stock } : item) } : wh))
  }

  const handleSave = async () => {
    if (!nameAr.trim() || !nameEn.trim() || !price) {
      alert('يرجى ملء الحقول المطلوبة')
      return
    }
    try {
      setSaving(true)
      const allImages = [mainImage || 'https://placehold.co/400x500/F3B423/1D355E?text=Product', ...gallery]
      const data = {
        category_id: categoryId,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
        description_ar: descAr.trim(),
        description_en: descEn.trim(),
        price: parseFloat(price),
        images: allImages,
        custom_sizes: customSizes,
        warehouses,
      }
      if (product) {
        await updateProduct(product.id, data)
      } else {
        await createProduct(data)
      }
      await onRefresh()
      onClose()
    } catch (err: any) {
      alert('خطأ في حفظ المنتج: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    setNameAr(product?.name_ar || '')
    setNameEn(product?.name_en || '')
    setDescAr(product?.description_ar || '')
    setDescEn(product?.description_en || '')
    setCategoryId(product?.category_id || categories[0]?.id || '')
    setPrice(product?.price?.toString() || '')
    setMainImage(product?.images?.[0] || '')
    setGallery(product?.images?.slice(1) || [])
    setCustomSizes(product?.custom_sizes || '')
    if (product?.warehouses && product.warehouses.length > 0) {
      setWarehouses(JSON.parse(JSON.stringify(product.warehouses)))
    } else {
      const variants = product?.variants || []
      setWarehouses([{ name: 'المخزن الرئيسي', items: variants.map((v: any) => ({ size: v.size, stock: v.stock || 0 })) }])
    }
  }, [product])

  return (
    <Modal open={open} onClose={onClose} title={product ? 'تعديل المنتج' : 'إضافة منتج جديد'} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="الاسم (عربي)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="اسم المنتج بالعربية" />
          <InputField label="الاسم (English)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Product name in English" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="القسم" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
            ))}
          </SelectField>
          <InputField label="السعر (جنيه)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر" />
        </div>
        <TextareaField label="الوصف (عربي)" rows={2} value={descAr} onChange={(e) => setDescAr(e.target.value)} placeholder="وصف المنتج بالعربية" />
        <TextareaField label="الوصف (English)" rows={2} value={descEn} onChange={(e) => setDescEn(e.target.value)} placeholder="Product description in English" />
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">الصورة الرئيسية</label>
          <ImageUploader currentUrl={mainImage} prefix={`product_${product?.id || 'new'}`} onUpload={setMainImage} onRemove={() => setMainImage('')} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">معرض الصور</label>
          <GalleryUploader images={gallery} prefix={`product_${product?.id || 'new'}`} onChange={setGallery} />
        </div>
        <InputField label="المقاسات المخصصة (مفصولة بفواصل)" value={customSizes} onChange={(e) => handleCustomSizesChange(e.target.value)} placeholder="مثال: 2, 3, 4, 5, 6, 7, 8" />
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">المستودعات</label>
          {sizes.length === 0 ? (
            <p className="text-xs text-gray-400">أدخل المقاسات المخصصة أعلاه</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-right p-2 text-xs font-semibold text-gray-600 border border-gray-100 min-w-[110px]">المستودع</th>
                    {sizes.map(s => <th key={s} className="text-center p-2 text-xs font-semibold text-gray-600 border border-gray-100 min-w-[48px]">{s}</th>)}
                    <th className="text-center p-2 w-8 border border-gray-100"></th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map((wh, wi) => (
                    <tr key={wi} className="border-t border-gray-50">
                      <td className="p-1 border border-gray-50">
                        <input className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#F3B423] outline-none"
                          value={wh.name} onChange={(e) => updateWarehouseName(wi, e.target.value)} readOnly={wi === 0} />
                        {wi === 0 && <div className="text-[10px] text-gray-400 pr-1">رئيسي</div>}
                      </td>
                      {wh.items.map((item: any) => (
                        <td key={item.size} className="p-1 border border-gray-50">
                          <input type="number" min={0}
                            className="w-full px-1 py-1 text-xs text-center border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#F3B423] outline-none"
                            value={item.stock}
                            onChange={(e) => updateWarehouseStock(wi, item.size, parseInt(e.target.value) || 0)} />
                        </td>
                      ))}
                      <td className="p-1 border border-gray-50 text-center">
                        {wi > 0 && (
                          <button onClick={() => removeWarehouse(wi)} className="text-red-400 hover:text-red-600 text-xs leading-none">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sizes.length > 0 && (
            <button type="button" onClick={addWarehouse} className="mt-2 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition">
              + إضافة مستودع فرعي
            </button>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : product ? 'حفظ التغييرات' : 'إضافة المنتج'}
          </button>
          <button onClick={onClose} className="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ========================= CATEGORIES =========================
function CategoriesPage({ categories, onRefresh }: { categories: Category[]; onRefresh: () => Promise<void> }) {
  const [editId, setEditId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return
    try {
      await deleteCategoryDb(id)
      await onRefresh()
    } catch (err: any) {
      alert('خطأ في حذف التصنيف: ' + err.message)
    }
  }

  const toggleHidden = async (cat: Category) => {
    try {
      await updateCategory(cat.id, { hidden: !cat.hidden })
      await onRefresh()
    } catch (err: any) {
      alert('خطأ: ' + err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionTitle>إدارة التصنيفات</SectionTitle>
        <PrimaryButton onClick={() => { setEditId(null); setModalOpen(true) }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة تصنيف
        </PrimaryButton>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs font-semibold">
                <th className="text-right p-3">التصنيف</th>
                <th className="text-right p-3">الاسم (عربي)</th>
                <th className="text-right p-3">الاسم (English)</th>
                <th className="text-right p-3">الصورة</th>
                <th className="text-center p-3">إظهار</th>
                <th className="text-center p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {categories.filter(c => !c.parent_id).map(c => {
                const subs = categories.filter(s => String(s.parent_id) === String(c.id))
                const rows = [c, ...subs]
                return rows.map((cat, idx) => (
                  <tr key={cat.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3" style={{ paddingInlineStart: idx > 0 ? 24 : 0 }}>
                        <div className={`w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 flex-shrink-0 ${cat.image ? '' : 'bg-gray-100'}`}>
                          {cat.image ? <img src={cat.image} className="w-full h-full object-cover" alt="" /> : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">{cat.name_ar.charAt(0)}</div>
                          )}
                        </div>
                        <span className="font-semibold text-[#1D355E]">{cat.name_ar}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">{cat.name_ar}</td>
                    <td className="p-3 text-gray-600">{cat.name_en || '-'}</td>
                    <td className="p-3 text-xs text-gray-400 max-w-[120px] truncate" title={cat.image || ''}>{cat.image ? 'نعم' : 'لا'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleHidden(cat)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${cat.hidden ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {cat.hidden ? 'مخفي' : 'ظاهر'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ConfirmButton onClick={() => { setEditId(cat.id); setModalOpen(true) }} color="blue">تعديل</ConfirmButton>
                        <ConfirmButton onClick={() => handleDelete(cat.id)} color="red">حذف</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      </div>
      <CategoryModal open={modalOpen} onClose={() => { setModalOpen(false); setEditId(null) }} editId={editId} categories={categories} onRefresh={onRefresh} />
    </div>
  )
}

function CategoryModal({ open, onClose, editId, categories, onRefresh }: { open: boolean; onClose: () => void; editId: string | null; categories: Category[]; onRefresh: () => Promise<void> }) {
  const cat = editId ? categories.find(c => String(c.id) === String(editId)) : null
  const [nameAr, setNameAr] = useState(cat?.name_ar || '')
  const [nameEn, setNameEn] = useState(cat?.name_en || '')
  const [parentId, setParentId] = useState(cat?.parent_id || '')
  const [image, setImage] = useState(cat?.image || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNameAr(cat?.name_ar || '')
    setNameEn(cat?.name_en || '')
    setParentId(cat?.parent_id || '')
    setImage(cat?.image || '')
  }, [cat])

  const handleSave = async () => {
    if (!nameAr.trim()) {
      alert('يرجى إدخال اسم التصنيف بالعربية')
      return
    }
    try {
      setSaving(true)
      if (editId) {
        await updateCategory(editId, { name_ar: nameAr.trim(), name_en: nameEn.trim(), image, parent_id: parentId || null })
      } else {
        const slug = nameAr.trim().replace(/[^\w\u0600-\u06FF]/g, '_').toLowerCase()
        await createCategory({ name_ar: nameAr.trim(), name_en: nameEn.trim(), image, slug, parent_id: parentId || null, hidden: false, id: slug })
      }
      await onRefresh()
      onClose()
    } catch (err: any) {
      alert('خطأ في حفظ التصنيف: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={cat ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}>
      <div className="space-y-4">
        <InputField label="الاسم (عربي)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="اسم التصنيف بالعربية" />
        <InputField label="الاسم (English)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Category name in English" />
        <SelectField label="التصنيف الأب (اختياري)" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">— بدون —</option>
          {categories.filter(c => !c.parent_id && (!cat || String(c.id) !== String(cat.id))).map(p => (
            <option key={p.id} value={p.id}>{p.name_ar}</option>
          ))}
        </SelectField>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">صورة التصنيف</label>
          <ImageUploader currentUrl={image} prefix={`category_${cat?.id || 'new'}`} onUpload={setImage} onRemove={() => setImage('')} />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : cat ? 'حفظ التغييرات' : 'إضافة التصنيف'}
          </button>
          <button onClick={onClose} className="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ========================= COUPONS =========================
function CouponsPage({ coupons, categories, onRefresh }: { coupons: Coupon[]; categories: Category[]; onRefresh: () => Promise<void> }) {
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null)
  const [isAuto, setIsAuto] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const toggleActive = async (c: Coupon) => {
    try {
      await updateCoupon(c.id, { active: !c.active })
      await onRefresh()
    } catch (err: any) {
      alert('خطأ: ' + err.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return
    try {
      await deleteCouponDb(id)
      await onRefresh()
    } catch (err: any) {
      alert('خطأ في حذف الكوبون: ' + err.message)
    }
  }

  const autoApply = coupons.filter(c => c.auto_apply)
  const manualCoupons = coupons.filter(c => !c.auto_apply)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionTitle>إدارة الكوبونات والعروض</SectionTitle>
        <div className="flex items-center gap-2">
          <PrimaryButton onClick={() => { setEditCoupon(null); setIsAuto(false); setModalOpen(true) }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            إضافة كوبون
          </PrimaryButton>
          <button onClick={() => { setEditCoupon(null); setIsAuto(true); setModalOpen(true) }}
            className="px-4 py-2.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            إضافة عرض تلقائي
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 bg-[#1D355E]/5 border-b border-gray-100">
          <h3 className="font-bold text-[#1D355E]">العروض التلقائية (بدون كود)</h3>
          <p className="text-xs text-gray-500 mt-1">هذه العروض تطبق تلقائياً عند استيفاء الشروط</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs font-semibold">
                <th className="text-right p-3">العرض</th>
                <th className="text-right p-3">النوع</th>
                <th className="text-right p-3">القيمة</th>
                <th className="text-right p-3">الشروط</th>
                <th className="text-right p-3">ينتهي</th>
                <th className="text-center p-3">حالة</th>
                <th className="text-center p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {autoApply.map(c => {
                const cond = parseConditions(c.conditions)
                return (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-[#1D355E]">{getCurrentLang() === 'ar' ? c.label_ar : c.label_en}</td>
                    <td className="p-3">{c.type === 'percentage' ? 'نسبة %' : 'قيمة ثابتة'}</td>
                    <td className="p-3 font-bold text-[#F3B423]">{c.type === 'percentage' ? c.value + '%' : c.value + ' ج'}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {[
                        cond.minItems ? `أقل ${cond.minItems} قطع` : '',
                        cond.minAmount ? `أقل ${cond.minAmount} ج` : '',
                        cond.category ? `قسم: ${categories.find(cat => cat.slug === cond.category)?.name_ar || cond.category}` : '',
                        (cond.sizes && cond.sizes.length > 0) ? `مقاسات: ${cond.sizes.join('، ')}` : (cond.size ? `مقاس: ${cond.size}` : ''),
                      ].filter(Boolean).join(', ') || 'بدون شروط'}
                    </td>
                    <td className="p-3 text-xs">{formatExpiry(c.expires_at)}</td>
                    <td className="p-3 text-center"><StatusBadge active={c.active} /></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ConfirmButton onClick={() => { setEditCoupon(c); setIsAuto(true); setModalOpen(true) }} color="blue">تعديل</ConfirmButton>
                        <ConfirmButton onClick={() => toggleActive(c)} color={c.active ? 'red' : 'green'}>{c.active ? 'تعطيل' : 'تفعيل'}</ConfirmButton>
                        <ConfirmButton onClick={() => handleDelete(c.id)} color="red">حذف</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-[#1D355E]/5 border-b border-gray-100">
          <h3 className="font-bold text-[#1D355E]">كوبونات الخصم (بكود)</h3>
          <p className="text-xs text-gray-500 mt-1">يدخل العميل الكود عند الدفع للحصول على الخصم</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs font-semibold">
                <th className="text-right p-3">الكود</th>
                <th className="text-right p-3">النوع</th>
                <th className="text-right p-3">القيمة</th>
                <th className="text-right p-3">الشروط</th>
                <th className="text-center p-3">حالة</th>
                <th className="text-center p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {manualCoupons.map(c => {
                const cond = parseConditions(c.conditions)
                return (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="p-3"><span className="font-mono font-bold text-[#1D355E] bg-gray-100 px-2 py-0.5 rounded">{c.code}</span></td>
                    <td className="p-3">{c.type === 'percentage' ? 'نسبة %' : 'قيمة ثابتة'}</td>
                    <td className="p-3 font-bold text-[#F3B423]">{c.type === 'percentage' ? c.value + '%' : c.value + ' ج'}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {[
                        cond.minItems ? `أقل ${cond.minItems} قطع` : '',
                        cond.minAmount ? `أقل ${cond.minAmount} ج` : '',
                        cond.category ? `قسم: ${categories.find(cat => cat.slug === cond.category)?.name_ar || cond.category}` : '',
                        cond.size ? `مقاس: ${cond.size}` : '',
                      ].filter(Boolean).join(', ') || 'بدون شروط'}
                    </td>
                    <td className="p-3 text-center"><StatusBadge active={c.active} /></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ConfirmButton onClick={() => { setEditCoupon(c); setIsAuto(false); setModalOpen(true) }} color="blue">تعديل</ConfirmButton>
                        <ConfirmButton onClick={() => toggleActive(c)} color={c.active ? 'red' : 'green'}>{c.active ? 'تعطيل' : 'تفعيل'}</ConfirmButton>
                        <ConfirmButton onClick={() => handleDelete(c.id)} color="red">حذف</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CouponModal open={modalOpen} onClose={() => { setModalOpen(false); setEditCoupon(null) }} coupon={editCoupon} isAuto={isAuto} categories={categories} onRefresh={onRefresh} />
    </div>
  )
}

function CouponModal({ open, onClose, coupon, isAuto, categories, onRefresh }: { open: boolean; onClose: () => void; coupon: Coupon | null; isAuto: boolean; categories: Category[]; onRefresh: () => Promise<void> }) {
  const cond = coupon ? parseConditions(coupon.conditions) : {}
  const [autoApply, setAutoApply] = useState(coupon ? coupon.auto_apply : isAuto)
  const [code, setCode] = useState(coupon && !coupon.auto_apply ? coupon.code : '')
  const [type, setType] = useState<'percentage' | 'fixed'>(coupon?.type || 'percentage')
  const [value, setValue] = useState(coupon?.value?.toString() || '')
  const [minItems, setMinItems] = useState(cond.minItems?.toString() || '')
  const [minAmount, setMinAmount] = useState(cond.minAmount?.toString() || '')
  const [category, setCategory] = useState(cond.category || '')
  const [selectedSizes, setSelectedSizes] = useState<string[]>(cond.sizes || (cond.size ? [cond.size] : []))
  const [labelAr, setLabelAr] = useState(coupon?.label_ar || '')
  const [labelEn, setLabelEn] = useState(coupon?.label_en || '')
  const [expiresAt, setExpiresAt] = useState(coupon?.expires_at ? coupon.expires_at.slice(0, 16) : '')
  const [showCountdown, setShowCountdown] = useState(coupon?.show_countdown || false)
  const [saving, setSaving] = useState(false)

  const allSizes = getAllProductSizes([])

  const toggleSize = (s: string) => {
    setSelectedSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const handleSave = async () => {
    const codeVal = autoApply ? 'أوتوماتيك' : code.trim().toUpperCase()
    if (!codeVal || !value) {
      alert('يرجى ملء الحقول المطلوبة')
      return
    }
    try {
      setSaving(true)
      const conditions: Record<string, any> = {}
      if (minItems) conditions.minItems = parseInt(minItems)
      if (minAmount) conditions.minAmount = parseFloat(minAmount)
      if (category) conditions.category = category
      if (selectedSizes.length > 0) conditions.sizes = selectedSizes

      const data: Record<string, any> = {
        code: codeVal,
        auto_apply: autoApply,
        type,
        value: parseFloat(value),
        conditions,
        label_ar: labelAr.trim(),
        label_en: labelEn.trim(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        show_countdown: showCountdown,
      }

      if (coupon) {
        await updateCoupon(coupon.id, data)
      } else {
        data.active = true
        await createCoupon(data as any)
      }
      await onRefresh()
      onClose()
    } catch (err: any) {
      alert('خطأ في حفظ الكوبون: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    setAutoApply(coupon ? coupon.auto_apply : isAuto)
    setCode(coupon && !coupon.auto_apply ? coupon.code : '')
    setType(coupon?.type || 'percentage')
    setValue(coupon?.value?.toString() || '')
    setMinItems(cond.minItems?.toString() || '')
    setMinAmount(cond.minAmount?.toString() || '')
    setCategory(cond.category || '')
    setSelectedSizes(cond.sizes || (cond.size ? [cond.size] : []))
    setLabelAr(coupon?.label_ar || '')
    setLabelEn(coupon?.label_en || '')
    setExpiresAt(coupon?.expires_at ? coupon.expires_at.slice(0, 16) : '')
    setShowCountdown(coupon?.show_countdown || false)
  }, [coupon, isAuto])

  return (
    <Modal open={open} onClose={onClose} title={coupon ? 'تعديل الكوبون' : (autoApply ? 'إضافة عرض تلقائي' : 'إضافة كوبون جديد')}>
      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#F3B423] focus:ring-[#F3B423]" />
            <span className="text-sm font-semibold text-gray-700">عرض تلقائي (بدون كود)</span>
          </label>
        </div>
        {!autoApply && (
          <InputField label="كود الخصم" value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثال: SAVE20" className="font-mono font-bold uppercase" />
        )}
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="نوع الخصم" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="percentage">نسبة مئوية (%)</option>
            <option value="fixed">قيمة ثابتة (جنيه)</option>
          </SelectField>
          <InputField label="القيمة" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="10" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="أقل عدد قطع" type="number" value={minItems} onChange={(e) => setMinItems(e.target.value)} placeholder="بدون شرط" />
          <InputField label="أقل مبلغ (جنيه)" type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="بدون شرط" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="قسم محدد" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">كل الأقسام</option>
            {categories.map(cat => (
              <option key={cat.slug} value={cat.slug}>{cat.name_ar}</option>
            ))}
          </SelectField>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">المقاسات</label>
            <div className="flex flex-wrap gap-2">
              {allSizes.map(s => (
                <button key={s} type="button" onClick={() => toggleSize(s)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                    selectedSizes.includes(s)
                      ? 'bg-[#1D355E] text-white border-[#1D355E]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#F3B423]'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">اترك الكل بدون اختيار ليشمل كل المقاسات</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">العرض (ظاهر للعملاء)</label>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} placeholder="وصف العرض بالعربية" />
            <InputField label="" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} placeholder="Offer description in English" />
          </div>
        </div>
        {autoApply && (
          <div>
            <InputField label="ينتهي في" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">اتركه فارغاً إذا كان العرض بدون وقت انتهاء</p>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input type="checkbox" checked={showCountdown} onChange={(e) => setShowCountdown(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#F3B423] focus:ring-[#F3B423]" />
              <span className="text-sm text-gray-700">إظهار كعداد تنازلي في صفحة المنتجات</span>
            </label>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : coupon ? 'حفظ التغييرات' : 'إضافة الكوبون'}
          </button>
          <button onClick={onClose} className="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ========================= ORDERS =========================
function OrdersPage({ orders, products, onRefresh, updateStatus }: { orders: Order[]; products: Product[]; onRefresh: () => Promise<void>; updateStatus: (id: number, status: string) => Promise<void> }) {
  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateStatus(id, newStatus)
    } catch (err: any) {
      alert('خطأ في تحديث حالة الطلب: ' + err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <SectionTitle>إدارة الطلبات</SectionTitle>
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">{pendingCount} معلق</span>
        )}
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          <p className="text-gray-500 text-lg">لا توجد طلبات بعد</p>
        </div>
      ) : (
        orders.slice().reverse().map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <span className="font-bold text-[#1D355E] text-lg">#{order.id}</span>
                <span className="text-xs text-gray-500 mr-2">{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ConfirmButton onClick={() => { setEditOrder(order); setModalOpen(true) }} color="blue">تعديل الطلب</ConfirmButton>
                <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  className="px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F3B423] outline-none">
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{statusLabels[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs">معلومات العميل</span>
                <p className="font-semibold">{order.customer_name}</p>
                <p className="text-gray-500">{order.customer_phone}</p>
                <p className="text-gray-500">{order.customer_city} - {order.customer_address}</p>
                {order.notes && <p className="text-gray-500">{order.notes}</p>}
              </div>
              <div>
                <span className="text-gray-500 text-xs">المنتجات</span>
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                    {item.image && <img src={item.image} alt="" className="w-10 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-50" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{item.name_ar || item.name_en}</div>
                      <div className="text-xs text-gray-500">مقاس {item.size} &times;{item.quantity}</div>
                    </div>
                    <span className="font-semibold text-sm whitespace-nowrap">{item.price * item.quantity} ج</span>
                  </div>
                ))}
              </div>
              <div>
                <span className="text-gray-500 text-xs">المحصل</span>
                <div className="text-lg font-extrabold text-[#1D355E]">{order.total} ج</div>
                {Number(order.discount) > 0 && <div className="text-xs text-green-600">خصم: {order.discount} ج</div>}
              </div>
            </div>
          </div>
        ))
      )}
      <OrderEditModal open={modalOpen} onClose={() => { setModalOpen(false); setEditOrder(null) }} order={editOrder} products={products} onRefresh={onRefresh} />
    </div>
  )
}

function OrderEditModal({ open, onClose, order, products, onRefresh }: { open: boolean; onClose: () => void; order: Order | null; products: Product[]; onRefresh: () => Promise<void> }) {
  const [customerName, setCustomerName] = useState(order?.customer_name || '')
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone || '')
  const [customerCity, setCustomerCity] = useState(order?.customer_city || '')
  const [customerAddress, setCustomerAddress] = useState(order?.customer_address || '')
  const [notes, setNotes] = useState(order?.notes || '')
  const [shipping, setShipping] = useState(order?.shipping?.toString() || '0')
  const [discount, setDiscount] = useState(order?.discount?.toString() || '0')
  const [couponCode, setCouponCode] = useState(order?.coupon_code || '')
  const [items, setItems] = useState<Array<{ productId: number; size: string; quantity: number; price: number; name_ar: string; name_en: string }>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (order) {
      setCustomerName(order.customer_name || '')
      setCustomerPhone(order.customer_phone || '')
      setCustomerCity(order.customer_city || '')
      setCustomerAddress(order.customer_address || '')
      setNotes(order.notes || '')
      setShipping((order as any).shipping?.toString() || '0')
      setDiscount(order.discount?.toString() || '0')
      setCouponCode((order as any).coupon_code || '')
      setItems((order.items || []).map(item => ({
        productId: item.product_id,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        name_ar: item.name_ar || '',
        name_en: item.name_en || '',
      })))
    }
  }, [order])

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const total = Math.max(0, subtotal + (parseFloat(shipping) || 0) - (parseFloat(discount) || 0))

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'productId') {
        const product = products.find(p => String(p.id) === String(value))
        if (product) {
          updated.name_ar = product.name_ar
          updated.name_en = product.name_en
          updated.price = product.price
        }
      }
      return updated
    }))
  }

  const addItem = () => {
    setItems(prev => [...prev, { productId: 0, size: '', quantity: 1, price: 0, name_ar: '', name_en: '' }])
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!order) return
    try {
      setSaving(true)
      const updates = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_city: customerCity.trim(),
        customer_address: customerAddress.trim(),
        notes: notes.trim(),
        items: items.map(i => ({ ...i, image: '', category: '' })),
        subtotal,
        shipping: parseFloat(shipping) || 0,
        discount: parseFloat(discount) || 0,
        total,
        coupon_code: couponCode.trim() || null,
        admin_modified: true,
        admin_modified_at: new Date().toISOString(),
      }
      await updateOrder(order.id, updates)
      await onRefresh()
      onClose()
    } catch (err: any) {
      alert('خطأ في حفظ التعديلات: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!order) return null

  return (
    <Modal open={open} onClose={onClose} title={`تعديل الطلب #${order.id}`} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="الاسم" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <InputField label="الهاتف" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          <InputField label="المدينة" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} />
          <InputField label="العنوان" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
        </div>
        <TextareaField label="ملاحظات العميل" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <hr />
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#1D355E]">المنتجات</h3>
          <ConfirmButton onClick={addItem} color="green">+ إضافة منتج</ConfirmButton>
        </div>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد منتجات</p>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <select value={item.productId || ''} onChange={(e) => updateItem(idx, 'productId', Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#F3B423] outline-none">
                    <option value="">اختر منتج</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name_ar}</option>
                    ))}
                  </select>
                </div>
                <select value={item.size} onChange={(e) => updateItem(idx, 'size', e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-20 focus:ring-2 focus:ring-[#F3B423] outline-none">
                  <option value="">—</option>
                  {(products.find(p => String(p.id) === String(item.productId))?.variants || []).map(v => (
                    <option key={v.size} value={v.size}>{v.size}</option>
                  ))}
                </select>
                <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-16 text-center focus:ring-2 focus:ring-[#F3B423] outline-none" />
                <input type="number" min={0} step={0.01} value={item.price} onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm w-20 text-center focus:ring-2 focus:ring-[#F3B423] outline-none" />
                <span className="text-sm font-semibold text-[#1D355E] w-16 text-center">{(item.price * item.quantity).toFixed(0)}</span>
                <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))
          )}
        </div>
        <hr />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="الشحن (ج)" type="number" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          <InputField label="الخصم (ج)" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          <InputField label="كود الخصم" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between text-sm text-gray-600"><span>المجموع الفرعي</span><span>{subtotal.toFixed(0)} ج</span></div>
          <div className="flex justify-between text-sm text-gray-600"><span>الشحن</span><span>{(parseFloat(shipping) || 0).toFixed(0)} ج</span></div>
          <div className="flex justify-between text-sm text-red-500"><span>الخصم</span><span>{(parseFloat(discount) || 0).toFixed(0)} ج</span></div>
          <div className="flex justify-between text-lg font-bold text-[#1D355E] mt-2 pt-2 border-t"><span>الإجمالي</span><span>{total.toFixed(0)} ج</span></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
          <button onClick={onClose} className="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ========================= POPUP =========================
function PopupPage({ popup: popupSettings, onSave }: { popup: any; onSave: (p: any) => Promise<void> }) {
  const [enabled, setEnabled] = useState(popupSettings?.enabled || false)
  const [imageUrl, setImageUrl] = useState(popupSettings?.imageUrl || '')
  const [linkUrl, setLinkUrl] = useState(popupSettings?.linkUrl || '')
  const [couponCode, setCouponCode] = useState(popupSettings?.couponCode || '')
  const [label, setLabel] = useState(popupSettings?.label || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEnabled(popupSettings?.enabled || false)
    setImageUrl(popupSettings?.imageUrl || '')
    setLinkUrl(popupSettings?.linkUrl || '')
    setCouponCode(popupSettings?.couponCode || '')
    setLabel(popupSettings?.label || '')
  }, [popupSettings])

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({ enabled, imageUrl, linkUrl, couponCode, label })
      alert('تم حفظ إعدادات الإعلان المنبثق')
    } catch (err: any) {
      alert('خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionTitle>الإعلان المنبثق (Popup)</SectionTitle>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
            <span className="text-sm font-semibold text-gray-700">تفعيل الإعلان المنبثق</span>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">صورة الإعلان</label>
            <ImageUploader currentUrl={imageUrl} prefix="popup" onUpload={setImageUrl} onRemove={() => setImageUrl('')} />
          </div>
          <InputField label="رابط الصورة (اختياري)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
          <InputField label="كود الخصم" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="مثال: WELCOME10" />
          <InputField label="النص" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: خصم 10% على أول طلب" />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">معاينة</label>
            <div className="border border-gray-200 rounded-2xl overflow-hidden max-w-sm mx-auto">
              {imageUrl ? <img src={imageUrl} className="w-full h-48 object-cover" alt="" /> : <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">الصورة</div>}
              <div className="p-4 text-center">
                <div className="text-xs text-gray-500 mb-2">{label || 'كود الخصم'}</div>
                <div className="inline-block bg-[#F3B423] text-[#1D355E] font-bold px-6 py-2 rounded-xl text-sm">{couponCode || 'CODE'}</div>
              </div>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>
      <div className="mt-4 text-xs text-gray-400">المنبثق يظهر مرة واحدة لكل زائر عند أول دخول للموقع. يختفي بعد إغلاقه أو نسخ الكود.</div>
    </div>
  )
}

// ========================= HERO =========================
function HeroPage({ slides: initialSlides, onSave }: { slides: any[]; onSave: (s: any[]) => Promise<void> }) {
  const [slides, setSlides] = useState<any[]>(initialSlides)
  const [editModal, setEditModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null })

  useEffect(() => {
    setSlides(initialSlides)
  }, [initialSlides])

  const openAdd = () => setEditModal({ open: true, index: null })
  const openEdit = (i: number) => setEditModal({ open: true, index: i })
  const closeModal = () => setEditModal({ open: false, index: null })

  const handleSaveSlide = async (image: string, link: string) => {
    if (!image) { alert('يرجى اختيار صورة للسلايدر'); return }
    const newSlides = [...slides]
    const slide = { image, link }
    if (editModal.index !== null && editModal.index >= 0 && editModal.index < newSlides.length) {
      newSlides[editModal.index] = slide
    } else {
      newSlides.push(slide)
    }
    await onSave(newSlides)
    setSlides(newSlides)
    closeModal()
  }

  const handleDelete = async (i: number) => {
    const newSlides = slides.filter((_, idx) => idx !== i)
    await onSave(newSlides)
    setSlides(newSlides)
  }

  const handleMove = async (i: number, direction: number) => {
    const target = i + direction
    if (target < 0 || target >= slides.length) return
    const newSlides = [...slides]
    ;[newSlides[i], newSlides[target]] = [newSlides[target], newSlides[i]]
    await onSave(newSlides)
    setSlides(newSlides)
  }

  return (
    <div>
      <SectionTitle>السلايدر الرئيسي</SectionTitle>
      <div className="flex items-center gap-2 mb-6">
        <PrimaryButton onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة صورة
        </PrimaryButton>
      </div>
      {slides.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p className="text-gray-500 text-lg mb-2">لا توجد صور</p>
          <p className="text-gray-400 text-sm">أضف صوراً للسلايدر الرئيسي</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slides.map((slide: any, i: number) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="aspect-[16/9] bg-gray-100 relative">
                <img src={slide.image} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="p-3">
                <div className="text-xs text-gray-500 truncate mb-2 text-left" style={{ direction: 'ltr' }}>
                  {slide.link ? <span className="font-semibold">{slide.link}</span> : <span className="text-gray-400">بدون رابط</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {i > 0 && <ConfirmButton onClick={() => handleMove(i, -1)} color="blue">↑</ConfirmButton>}
                    {i < slides.length - 1 && <ConfirmButton onClick={() => handleMove(i, 1)} color="blue">↓</ConfirmButton>}
                  </div>
                  <div className="flex gap-1">
                    <ConfirmButton onClick={() => openEdit(i)} color="blue">تعديل</ConfirmButton>
                    <ConfirmButton onClick={() => handleDelete(i)} color="red">حذف</ConfirmButton>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <HeroSlideModal open={editModal.open} onClose={closeModal} slide={editModal.index !== null ? slides[editModal.index] : null} onSave={handleSaveSlide} />
    </div>
  )
}

function HeroSlideModal({ open, onClose, slide, onSave }: { open: boolean; onClose: () => void; slide: any; onSave: (image: string, link: string) => Promise<void> }) {
  const [image, setImage] = useState(slide?.image || '')
  const [link, setLink] = useState(slide?.link || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setImage(slide?.image || '')
    setLink(slide?.link || '')
  }, [slide])

  const handleSave = async () => {
    setSaving(true)
    await onSave(image, link)
    setSaving(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-xl transition">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-xl font-bold text-[#1D355E] mb-6">{slide ? 'تعديل الصورة' : 'إضافة صورة للسلايدر'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">صورة السلايدر</label>
            <ImageUploader currentUrl={image} prefix={`hero_${Date.now()}`} onUpload={setImage} onRemove={() => setImage('')} />
          </div>
          <InputField label="الرابط (اختياري) — عند الضغط على الصورة" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com" />
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={onClose} className="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================= FAB =========================
function FabPage({ fab: fabSettings, onSave }: { fab: any; onSave: (f: any) => Promise<void> }) {
  const [settings, setSettings] = useState(() => ({
    whatsapp: fabSettings?.whatsapp || '',
    sales: fabSettings?.sales || '',
    complaints: fabSettings?.complaints || '',
    whatsapp_label: fabSettings?.whatsapp_label || 'واتساب',
    sales_label: fabSettings?.sales_label || 'واتس المبيعات',
    complaints_label: fabSettings?.complaints_label || 'الشكاوي والمقترحات',
    ...(fabSettings || {}),
  }))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (fabSettings) {
      setSettings({
        whatsapp: fabSettings.whatsapp || '',
        sales: fabSettings.sales || '',
        complaints: fabSettings.complaints || '',
        whatsapp_label: fabSettings.whatsapp_label || 'واتساب',
        sales_label: fabSettings.sales_label || 'واتس المبيعات',
        complaints_label: fabSettings.complaints_label || 'الشكاوي والمقترحات',
      })
    }
  }, [fabSettings])

  const update = (key: string, val: string) => setSettings(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(settings)
      alert('تم حفظ إعدادات زر الاتصال')
    } catch (err: any) {
      alert('خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionTitle>زر الاتصال العائم</SectionTitle>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="اسم الزر (واتساب)" value={settings.whatsapp_label} onChange={(e) => update('whatsapp_label', e.target.value)} />
            <InputField label="الرقم" value={settings.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="مثال: 01098286085" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="اسم الزر (المبيعات)" value={settings.sales_label} onChange={(e) => update('sales_label', e.target.value)} />
            <InputField label="الرقم" value={settings.sales} onChange={(e) => update('sales', e.target.value)} placeholder="مثال: 01061212626" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="اسم الزر (الشكاوي)" value={settings.complaints_label} onChange={(e) => update('complaints_label', e.target.value)} />
            <InputField label="الرقم" value={settings.complaints} onChange={(e) => update('complaints', e.target.value)} placeholder="مثال: 01012221197" />
          </div>
          <div className="pt-4 border-t border-gray-100">
            <div className="text-sm font-semibold text-gray-700 mb-3">معاينة</div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <div className="flex flex-col gap-2 max-w-[260px]">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px]">💬</div>
                  <div className="text-xs font-semibold text-[#1D355E]">{settings.whatsapp_label} <span className="text-gray-400 font-normal">{settings.whatsapp}</span></div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px]">🛒</div>
                  <div className="text-xs font-semibold text-[#1D355E]">{settings.sales_label} <span className="text-gray-400 font-normal">{settings.sales}</span></div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-[#1D355E] flex items-center justify-center text-white text-[10px]">📞</div>
                  <div className="text-xs font-semibold text-[#1D355E]">{settings.complaints_label} <span className="text-gray-400 font-normal">{settings.complaints}</span></div>
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-[#F3B423] text-[#1D355E] font-bold rounded-xl hover:bg-[#D49A1A] transition disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========================= STAFF =========================
function StaffPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'error' | 'success' | 'loading' } | null>(null)

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchProfiles()
      setProfiles(data || [])
    } catch {
      console.error('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  const handleCreate = async () => {
    if (!staffName.trim() || !staffEmail.trim() || !staffPassword.trim()) {
      setStatusMsg({ text: 'يرجى ملء جميع الحقول', type: 'error' })
      return
    }
    if (staffPassword.length < 6) {
      setStatusMsg({ text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', type: 'error' })
      return
    }
    try {
      setStatusMsg({ text: 'جاري إنشاء الحساب...', type: 'loading' })
      await createStaffAccount(staffEmail.trim(), staffPassword.trim(), staffName.trim())
      setStatusMsg({ text: 'تم إنشاء حساب الموظف بنجاح!', type: 'success' })
      setStaffName('')
      setStaffEmail('')
      setStaffPassword('')
      loadProfiles()
    } catch (e: any) {
      setStatusMsg({ text: e.message, type: 'error' })
    }
  }

  const handleDeleteStaff = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return
    try {
      await updateProfileRole(userId, 'user')
      loadProfiles()
      alert('تم حذف الموظف بنجاح')
    } catch (e: any) {
      alert('فشل حذف الموظف: ' + e.message)
    }
  }

  const handlePromote = async (userId: string) => {
    if (!confirm('هل أنت متأكد من ترقية هذا المستخدم إلى موظف؟')) return
    try {
      await updateProfileRole(userId, 'staff')
      loadProfiles()
      alert('تمت الترقية بنجاح')
    } catch (e: any) {
      alert('فشل الترقية: ' + e.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SectionTitle>إدارة الموظفين</SectionTitle>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-bold text-[#1D355E] mb-4">إنشاء حساب موظف جديد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input type="text" placeholder="الاسم الكامل" value={staffName} onChange={(e) => setStaffName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] focus:border-transparent outline-none" />
          <input type="email" placeholder="البريد الإلكتروني" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] focus:border-transparent outline-none" />
          <input type="password" placeholder="كلمة المرور" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F3B423] focus:border-transparent outline-none" />
        </div>
        <button onClick={handleCreate} className="bg-[#1D355E] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D355E]/90 transition">
          إنشاء الحساب
        </button>
        {statusMsg && (
          <div className={`mt-2 text-sm ${statusMsg.type === 'error' ? 'text-red-500' : statusMsg.type === 'success' ? 'text-green-600' : 'text-blue-500'}`}>
            {statusMsg.text}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا يوجد موظفين</div>
        ) : (
          profiles.map(p => {
            const isAdmin = p.role === 'admin'
            const isStaff = p.role === 'staff'
            const bgColor = isAdmin ? 'bg-[#1D355E]' : isStaff ? 'bg-[#F3B423]' : 'bg-gray-400'
            const roleText = isAdmin ? 'مدير' : isStaff ? 'موظف' : 'مستخدم'
            return (
              <div key={p.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${bgColor}`}>
                    {(p.full_name || '?')[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{p.full_name || '—'}</div>
                    <div className="text-xs text-gray-500">{roleText}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <span className="text-xs bg-[#1D355E]/10 text-[#1D355E] px-3 py-1 rounded-full font-semibold">لا يمكن حذف المدير</span>
                  ) : isStaff ? (
                    <ConfirmButton onClick={() => handleDeleteStaff(p.id)} color="red">حذف</ConfirmButton>
                  ) : (
                    <ConfirmButton onClick={() => handlePromote(p.id)} color="green">ترقية إلى موظف</ConfirmButton>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
