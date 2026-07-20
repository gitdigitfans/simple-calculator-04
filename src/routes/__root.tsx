import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useProductStore } from '~/stores/products'
import { useSettingsStore } from '~/stores/settings'
import { getCurrentLang, setLang as setLangStore, initLang } from '~/lib/translations'
import '~/styles/globals.css'

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'title', content: 'كيوت كيدز - متجر ملابس الأطفال' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
      },
    ],
  }),
})

function RootComponent() {
  return (
    <RootLayout>
      <Outlet />
    </RootLayout>
  )
}

function RootLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const authInit = useAuthStore((s) => s.init)
  const cartInit = useCartStore((s) => s.init)
  const productsInit = useProductStore((s) => s.init)
  const loadHero = useSettingsStore((s) => s.loadHeroSlides)
  const loadPopup = useSettingsStore((s) => s.loadPopup)
  const loadFab = useSettingsStore((s) => s.loadFab)

  useEffect(() => {
    const lang = initLang()
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.style.fontFamily = lang === 'ar' ? 'Tajawal' : 'Poppins'

    authInit()
    cartInit()
    productsInit()
    loadHero()
    loadPopup()
    loadFab()

    setMounted(true)
  }, [])

  useEffect(() => {
    const lang = getCurrentLang()
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.style.fontFamily = lang === 'ar' ? 'Tajawal' : 'Poppins'
  })

  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
        {/* Meta Pixel */}
        <script dangerouslySetInnerHTML={{ __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,
'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','280864144478549');fbq('init','508489808530599');fbq('track','PageView');
`}} />
        <noscript>
          <img height="1" width="1" style={{display:'none'}} src="https://www.facebook.com/tr?id=280864144478549&ev=PageView&noscript=1" />
          <img height="1" width="1" style={{display:'none'}} src="https://www.facebook.com/tr?id=508489808530599&ev=PageView&noscript=1" />
        </noscript>
        {/* TikTok Pixel */}
        <script dangerouslySetInnerHTML={{ __html: `
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,
ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";
n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];
a.parentNode.insertBefore(n,a)};ttq.load('D1LAO9JC77U853IT9KF0');ttq.page();
}(window,document,'ttq');
`}} />
      </head>
      <body className="font-tajawal bg-[#F8F9FA] text-gray-800">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
