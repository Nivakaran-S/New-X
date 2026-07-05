'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  User,
  Package,
  BookMarked,
  FileText,
  Star,
  Gift,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'My Profile', href: '/account', icon: User },
  { label: 'My Orders', href: '/account/orders', icon: Package },
  { label: 'Saved Lists', href: '/account/saved-lists', icon: BookMarked },
  { label: 'Account Statement', href: '/account/statement', icon: FileText, wholesaleOnly: true },
  { label: 'Loyalty Points', href: '/account/loyalty', icon: Star },
  { label: 'Referral Program', href: '/account/referral', icon: Gift },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, token } = useAuthStore()

  useEffect(() => {
    if (!token && !user) {
      router.push('/login?next=' + pathname)
    }
  }, [token, user, router, pathname])

  if (!user) return null

  const isWholesale = user.accountType === 'WHOLESALE'

  const navItems = NAV_ITEMS.filter((item) => !item.wholesaleOnly || isWholesale)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden sticky top-20">
            {/* User info */}
            <div className="bg-green-600 p-4 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <User className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold truncate">{user.name ?? 'My Account'}</p>
              <p className="text-xs text-green-100 truncate">{user.email}</p>
            </div>

            {/* Nav links */}
            <nav className="p-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === '/account'
                    ? pathname === '/account'
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-green-600' : 'text-gray-400')} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-green-500" />}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile tab bar */}
        <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 pb-1 min-w-max">
            {navItems.map((item) => {
              const isActive =
                item.href === '/account'
                  ? pathname === '/account'
                  : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                    isActive
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-300',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Main content */}
        <main className="lg:col-span-3">{children}</main>
      </div>
    </div>
  )
}
