'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Package,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Tag,
  Ticket,
  UserCheck,
  Truck,
  MessageCircle,
  Star,
  TrendingUp,
  Briefcase,
  Store,
  Percent,
  Share2,
  Bell,
  Shield,
  Receipt,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { SafeUser } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { href: '/orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
      { href: '/payments/pending', label: 'Payments', icon: <CreditCard size={18} /> },
      { href: '/products', label: 'Products', icon: <Package size={18} /> },
      { href: '/inventory', label: 'Inventory', icon: <ClipboardList size={18} /> },
      { href: '/customers', label: 'Customers', icon: <Users size={18} /> },
      {
        href: '/analytics',
        label: 'Analytics',
        icon: <BarChart3 size={18} />,
        roles: ['SUPER_ADMIN'],
      },
      {
        href: '/settings',
        label: 'Settings',
        icon: <Settings size={18} />,
        roles: ['SUPER_ADMIN'],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        href: '/pricing',
        label: 'Pricing',
        icon: <Tag size={18} />,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
      {
        href: '/coupons',
        label: 'Coupons',
        icon: <Ticket size={18} />,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
      {
        href: '/promotions',
        label: 'Promotions',
        icon: <Percent size={18} />,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
      {
        href: '/stock-alerts',
        label: 'Stock Alerts',
        icon: <Bell size={18} />,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
      {
        href: '/wholesale',
        label: 'Wholesale Approvals',
        icon: <UserCheck size={18} />,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
      {
        href: '/delivery',
        label: 'Delivery',
        icon: <Truck size={18} />,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
      {
        href: '/whatsapp',
        label: 'WhatsApp',
        icon: <MessageCircle size={18} />,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
    ],
  },
  {
    title: 'Growth',
    items: [
      {
        href: '/loyalty',
        label: 'Loyalty',
        icon: <Star size={18} />,
        roles: ['SUPER_ADMIN'],
      },
      {
        href: '/forecasting',
        label: 'Forecasting',
        icon: <TrendingUp size={18} />,
        roles: ['SUPER_ADMIN'],
      },
      {
        href: '/crm',
        label: 'CRM / Sales Reps',
        icon: <Briefcase size={18} />,
        roles: ['SUPER_ADMIN'],
      },
      {
        href: '/vendors',
        label: 'Vendors',
        icon: <Store size={18} />,
        roles: ['SUPER_ADMIN'],
      },
      {
        href: '/referrals',
        label: 'Referrals',
        icon: <Share2 size={18} />,
        roles: ['SUPER_ADMIN'],
      },
    ],
  },
  {
    title: 'Compliance',
    items: [
      {
        href: '/ird',
        label: 'IRD / RAMIS',
        icon: <Receipt size={18} />,
        roles: ['SUPER_ADMIN'],
      },
      {
        href: '/audit',
        label: 'Audit Log',
        icon: <Shield size={18} />,
        roles: ['SUPER_ADMIN'],
      },
    ],
  },
]

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  CASHIER: 'bg-green-100 text-green-800',
}

interface SidebarProps {
  user: SafeUser
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuthStore()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            H
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">Wonderland</p>
            <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {NAV_SECTIONS.map((section, si) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(user.role),
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={si}>
              {section.title && (
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-1">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-xs uppercase">
            {(user.name || user.email || '').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name || user.email}</p>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded font-medium',
                ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-800',
              )}
            >
              {user.role.replace('_', ' ')}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors w-full"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-shrink-0">{sidebarContent}</aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="flex-shrink-0">{sidebarContent}</div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
    </>
  )
}
