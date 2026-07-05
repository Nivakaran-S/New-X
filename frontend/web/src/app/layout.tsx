import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import MetaPixel from '@/components/analytics/MetaPixel'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'HealPlace – Sri Lanka Wholesale Distributor',
    template: '%s | HealPlace',
  },
  description:
    "Sri Lanka's Premier Wholesale Distributor of FMCG products. Fast delivery across Colombo. Wholesale & retail pricing available.",
  keywords: ['wholesale', 'FMCG', 'Sri Lanka', 'Colombo', 'Pettah', 'distributor'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HealPlace',
  },
  openGraph: {
    type: 'website',
    locale: 'en_LK',
    url: 'https://healplace.lk',
    siteName: 'HealPlace',
    title: 'HealPlace – Sri Lanka Wholesale Distributor',
    description: "Sri Lanka's Premier Wholesale Distributor of FMCG products.",
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-white antialiased">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <WhatsAppButton phone="94771234567" />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '8px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#16a34a', secondary: '#fff' },
            },
          }}
        />
        <MetaPixel />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
