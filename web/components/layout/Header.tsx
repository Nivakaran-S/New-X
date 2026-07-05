'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  ShoppingCart,
  Search,
  User,
  LogOut,
  Package,
  ChevronDown,
  X,
  Menu,
  Globe,
} from 'lucide-react'
import { useCartStore, useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const LANG_OPTIONS = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'si', label: 'සි', full: 'Sinhala' },
  { code: 'ta', label: 'த', full: 'Tamil' },
]

function LanguageToggle() {
  const [lang, setLang] = useState('en')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('lang')
    if (stored) setLang(stored)
  }, [])

  function selectLang(code: string) {
    localStorage.setItem('lang', code)
    setLang(code)
    setOpen(false)
    // Update URL param for SSR hydration (full translation is a future task)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', code)
    window.history.replaceState({}, '', url.toString())
  }

  const current = LANG_OPTIONS.find((l) => l.code === lang) ?? LANG_OPTIONS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="touch-target flex items-center gap-1 text-sm text-gray-600 hover:text-green-600 px-2 transition-colors"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4" />
        <span className="font-semibold">{current.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                onClick={() => selectLang(opt.code)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                  lang === opt.code
                    ? 'text-green-700 bg-green-50 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className="w-6 text-center font-medium">{opt.label}</span>
                <span className="text-gray-500">{opt.full}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Header() {
  const router = useRouter()
  const itemCount = useCartStore((s) => s.itemCount())
  const { user, logout } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Top bar */}
      <div className="bg-brand-600 text-white text-xs py-1 text-center px-4">
        Free delivery on orders over LKR 5,000 · WhatsApp: +94 77 123 4567
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14 gap-3">
          {/* Mobile menu button */}
          <button
            className="touch-target flex items-center justify-center md:hidden text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 font-bold text-xl text-brand-600 tracking-tight"
          >
            Heal<span className="text-gray-900">Place</span>
          </Link>

          {/* Search — hidden on very small screens, shown on sm+ */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex flex-1 items-center max-w-xl mx-4"
          >
            <div className="relative w-full">
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands…"
                className="w-full h-10 pl-4 pr-10 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Language toggle */}
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>

            {/* Search icon on mobile */}
            <Link
              href="/products"
              className="touch-target flex sm:hidden items-center justify-center text-gray-600 hover:text-brand-600"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Account */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="touch-target flex items-center gap-1 text-sm text-gray-700 hover:text-brand-600 px-2"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline max-w-[80px] truncate">
                    {user.name ?? user.email.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 hidden md:inline" />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      href="/account"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Package className="w-4 h-4" />
                      My Orders
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setAccountOpen(false)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="touch-target hidden sm:flex items-center gap-1 text-sm text-gray-700 hover:text-brand-600 px-2"
              >
                <User className="w-5 h-5" />
                <span className="hidden md:inline">Sign in</span>
              </Link>
            )}

            {/* Cart */}
            <Link
              href="/cart"
              className="touch-target flex items-center justify-center relative text-gray-700 hover:text-brand-600 px-2"
              aria-label={`Cart, ${itemCount} items`}
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-[3px]">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="sm:hidden pb-2">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, brands…"
              className="w-full h-10 pl-4 pr-10 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Category nav */}
      <nav className="hidden md:block border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <ul className="flex gap-6 text-sm h-10 items-center">
            {[
              { label: 'All Products', href: '/products' },
              { label: 'Cleaning & Hygiene', href: '/products?category=cleaning-hygiene' },
              { label: 'Personal Care', href: '/products?category=personal-care' },
              { label: 'Household', href: '/products?category=household' },
              { label: 'Food & Beverages', href: '/products?category=food-beverages' },
              { label: 'Wholesale', href: '/wholesale' },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-brand-600 font-medium transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="relative bg-white w-72 max-w-[85vw] h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-lg text-brand-600">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="touch-target flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <ul className="p-4 space-y-1 flex-1">
              {[
                { label: 'All Products', href: '/products' },
                { label: 'Cleaning & Hygiene', href: '/products?category=cleaning-hygiene' },
                { label: 'Personal Care', href: '/products?category=personal-care' },
                { label: 'Household', href: '/products?category=household' },
                { label: 'Food & Beverages', href: '/products?category=food-beverages' },
                { label: 'Wholesale', href: '/wholesale' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'block px-3 py-3 rounded-lg text-gray-700 hover:bg-brand-50 hover:text-brand-700 font-medium',
                      'touch-target',
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="p-4 border-t space-y-2">
              {/* Language toggle in mobile menu */}
              <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 font-medium">Language</span>
                <div className="ml-auto">
                  <LanguageToggle />
                </div>
              </div>
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Package className="w-4 h-4" />
                    My Account
                  </Link>
                  <button
                    onClick={() => {
                      logout()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-3 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block w-full text-center py-3 px-4 rounded-lg bg-brand-600 text-white font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
