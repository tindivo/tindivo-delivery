import { AutoHealPush } from '@/features/pwa/components/auto-heal-push'
import { InstallPromptBanner } from '@/features/pwa/components/install-prompt-banner'
import { RegisterPWA } from '@/features/pwa/components/register-pwa'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tindivo — Delivery para tu ciudad',
  description: 'Pedidos, motorizados y restaurantes conectados en tiempo real',
  manifest: '/manifest.webmanifest',
  applicationName: 'Tindivo',
  appleWebApp: {
    capable: true,
    // 'default' deja que iOS reserve espacio para la status bar (hora,
    // batería, señal). Con 'black-translucent' el contenido se renderiza
    // detrás del notch y el back button del GlassTopBar quedaba intocable.
    statusBarStyle: 'default',
    title: 'Tindivo',
  },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#ab3500',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Tindivo" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block"
        />
      </head>
      <body className="min-h-screen antialiased text-on-surface">
        <RegisterPWA />
        <Providers>
          <AutoHealPush />
          {children}
        </Providers>
        <InstallPromptBanner />
      </body>
    </html>
  )
}
