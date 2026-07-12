import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Truck, CreditCard, RotateCcw, MessageCircle, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/products/ProductCard'
import type { ProductCardData } from '@/components/products/ProductCard'
import { apiGet } from '@/lib/api'
import type { ApiResponse } from '@/types'

// The featured-products fetch below is best-effort: if the API is unreachable at
// build time it renders the empty state. Without a revalidate window that empty
// HTML would be frozen in permanently, so re-generate it periodically.
export const revalidate = 300

// Category data
const CATEGORIES = [
  {
    name: 'Cleaning & Hygiene',
    slug: 'cleaning-hygiene',
    icon: '🧴',
    color: 'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100',
  },
  {
    name: 'Personal Care',
    slug: 'personal-care',
    icon: '💆',
    color: 'bg-pink-50 border-pink-100',
    iconBg: 'bg-pink-100',
  },
  {
    name: 'Household',
    slug: 'household',
    icon: '🏠',
    color: 'bg-amber-50 border-amber-100',
    iconBg: 'bg-amber-100',
  },
  {
    name: 'Food & Beverages',
    slug: 'food-beverages',
    icon: '🥤',
    color: 'bg-green-50 border-green-100',
    iconBg: 'bg-green-100',
  },
]

const TRUST_ITEMS = [
  { icon: Truck, label: 'Fast Delivery', sub: 'Colombo next-day' },
  { icon: CreditCard, label: 'Bank Transfer', sub: 'Secure & simple' },
  { icon: RotateCcw, label: '7-day Returns', sub: 'Hassle-free' },
  { icon: MessageCircle, label: 'WhatsApp Support', sub: 'Real-time updates' },
]

async function getFeaturedProducts(): Promise<ProductCardData[]> {
  try {
    const res = await apiGet<ApiResponse<ProductCardData[]>>(
      '/products?featured=true&limit=8',
    )
    return res.data ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts()

  return (
    <div>
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-brand-700 to-brand-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-80 h-80 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-xl">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
              Sri Lanka&apos;s Premier Distributor
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
              Wholesale FMCG
              <br />
              <span className="text-brand-200">Delivered Fast</span>
            </h1>
            <p className="text-brand-100 text-base sm:text-lg mb-8 leading-relaxed">
              Cleaning products, personal care, household essentials — all at
              competitive prices. Serving shops, pharmacies & bulk buyers across
              Colombo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-bold px-6 py-3.5 rounded-xl hover:bg-brand-50 active:scale-95 transition-all text-base shadow-lg"
              >
                Shop Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/wholesale"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/60 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/10 transition-all text-base"
              >
                Apply for Wholesale Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Grid ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">Shop by Category</h2>
          <Link
            href="/products"
            className="text-sm text-brand-600 hover:underline flex items-center gap-1"
          >
            All products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 ${cat.color} hover:shadow-md active:scale-95 transition-all min-h-[100px]`}
            >
              <div className={`w-12 h-12 rounded-xl ${cat.iconBg} flex items-center justify-center text-2xl`}>
                {cat.icon}
              </div>
              <span className="text-sm font-semibold text-gray-800 text-center leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bestsellers ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Bestsellers</h2>
            <Link
              href="/products?featured=true"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:overflow-visible">
              {featuredProducts.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[200px] sm:w-auto">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            /* Skeleton placeholder when no products yet */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
                >
                  <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                  <div className="h-3 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-9 bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Trust Strip ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Wholesale CTA ────────────────────────────────────────────────── */}
      <section className="bg-gray-900 text-white py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block bg-brand-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
            For Businesses
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
            Are you a wholesaler or shop owner?
          </h2>
          <p className="text-gray-300 text-base mb-8 leading-relaxed">
            Apply for a wholesale account and unlock better pricing, credit
            terms, and priority delivery. Approved within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/wholesale"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all active:scale-95"
            >
              Apply for Wholesale Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://wa.me/94771234567?text=Hi%20Wonderland%2C%20I%27m%20interested%20in%20wholesale%20pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
