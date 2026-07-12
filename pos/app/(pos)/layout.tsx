'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Monitor, BarChart3, Package } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import type { Role } from '@/types'

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  MANAGER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  CASHIER: 'bg-green-500/20 text-green-300 border-green-500/30',
}

const ROLE_LABELS: Partial<Record<Role, string>> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, user, logout } = useAuthStore()

  useEffect(() => {
    if (!token || !user) {
      router.replace('/login')
    }
  }, [token, user, router])

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const roleClass =
    ROLE_COLORS[user.role] ??
    'bg-slate-500/20 text-slate-300 border-slate-500/30'
  const roleLabel = ROLE_LABELS[user.role] ?? user.role

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const navLinks = [
    { href: '/pos', label: 'POS', icon: Monitor },
    { href: '/eod', label: 'End of Day', icon: BarChart3 },
    ...(user.role === 'MANAGER' || user.role === 'SUPER_ADMIN'
      ? [{ href: '/products', label: 'Products', icon: Package }]
      : []),
  ]

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      {/* Top bar */}
      <header className="flex-none flex items-center justify-between px-4 h-12 bg-slate-800 border-b border-slate-700 shrink-0">
        {/* Left: Brand + nav */}
        <div className="flex items-center gap-6">
          <span className="font-bold text-brand-400 text-sm tracking-wide">
            Wonderland POS
          </span>
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: User info + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300 font-medium">
              {user.name}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleClass}`}
            >
              {roleLabel}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
