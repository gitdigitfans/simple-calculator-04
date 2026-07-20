import { useSettingsStore } from '~/stores/settings'
import { getCurrentLang, t } from '~/lib/translations'
import { useState, useEffect } from 'react'

const DISMISS_KEY = 'cuteKidsPopupDismissed'
const DISMISS_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default function PopupModal() {
  const { popup } = useSettingsStore()
  const lang = getCurrentLang()

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!popup?.enabled) return

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10)
        if (Date.now() - dismissedAt < DISMISS_DURATION) {
          return
        }
      }
    } catch {}

    setVisible(true)
  }, [popup?.enabled])

  const handleClose = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
  }

  if (!visible || !popup?.enabled) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 end-3 z-10 p-2 bg-white/80 hover:bg-white rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        {popup.image && (
          <img
            src={popup.image}
            alt={lang === 'ar' ? popup.title_ar : popup.title_en}
            className="w-full h-48 object-cover"
          />
        )}

        {/* Content */}
        <div className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">
            {lang === 'ar' ? popup.title_ar : popup.title_en}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {lang === 'ar' ? popup.description_ar : popup.description_en}
          </p>
          {popup.buttonLink && (
            <a
              href={popup.buttonLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              className="inline-block px-6 py-2 bg-[#F3B423] text-white rounded-xl font-medium hover:bg-[#D49A1A] transition-colors"
            >
              {lang === 'ar' ? popup.buttonText_ar : popup.buttonText_en}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
