import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AdminShell } from '@/components/layout/AdminShell'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HealPlace Admin',
  description: 'HealPlace wholesale FMCG distribution admin panel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AdminShell>{children}</AdminShell>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
