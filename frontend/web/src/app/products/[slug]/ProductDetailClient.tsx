'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import {
  Star,
  Minus,
  Plus,
  ShoppingCart,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  AlertCircle,
  Bell,
  BellCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore, useAuthStore } from '@/lib/store'
import { UnitSelector, type UnitOption } from '@/components/products/UnitSelector'
import { cn, formatLKRShort, buildWhatsAppUrl } from '@/lib/utils'
import { trackViewProduct } from '@/lib/analytics'
import type { ProductWithDetails } from '@healplace/types'

// ─── Sub-components ───────────────────────────────────────────────────

interface FbtProduct {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  price: number
  brand: string
}

function FrequentlyBoughtTogether({ variantId }: { variantId: string }) {
  const [products, setProducts] = useState<FbtProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!variantId) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/recommendations/frequently-bought/${variantId}`)
      .then((r) => r.json())
      .then((json) => setProducts(json.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [variantId])

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently Bought Together</h2>
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-36 flex-shrink-0 bg-gray-100 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) return null

  return (
    <div className="mt-12">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently Bought Together</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {products.slice(0, 4).map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="flex-shrink-0 w-36 bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative h-28 bg-gray-50">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt={p.name} fill className="object-contain p-2" sizes="144px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-3xl">📦</div>
              )}
            </div>
            <div className="p-2">
              <p className="text-[10px] text-gray-500 truncate">{p.brand}</p>
              <p className="text-xs font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">{p.name}</p>
              <p className="text-xs font-bold text-green-600">{formatLKRShort(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

interface ApiNudgeData {
  canUpgrade: boolean
  message: string
  savingAmount: number
  addMoreQty: number
}

function ApiPricingNudge({ variantId, qty, unitType }: { variantId: string; qty: number; unitType: string }) {
  const [nudge, setNudge] = useState<ApiNudgeData | null>(null)

  useEffect(() => {
    if (!variantId) return
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/recommendations/pricing-nudge/${variantId}?qty=${qty}&unitType=${unitType}`,
    )
      .then((r) => r.json())
      .then((json) => setNudge(json.data ?? null))
      .catch(() => setNudge(null))
  }, [variantId, qty, unitType])

  if (!nudge?.canUpgrade) return null

  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4 text-xs text-amber-800 font-medium">
      <span className="text-base leading-none">💡</span>
      {nudge.message || `Add ${nudge.addMoreQty} more and save ${formatLKRShort(nudge.savingAmount)} with case pricing!`}
    </div>
  )
}

function BackInStockAlert({ variantId, isOutOfStock }: { variantId: string; isOutOfStock: boolean }) {
  const [contact, setContact] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isOutOfStock) return null

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/stock-alerts/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, contact: contact.trim() }),
      })
      if (res.ok || res.status === 201) {
        setSubscribed(true)
        toast.success("We'll notify you when this is back in stock!")
      } else {
        toast.error('Could not subscribe. Please try again.')
      }
    } catch {
      toast.error('Could not subscribe. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
      {subscribed ? (
        <div className="flex items-center gap-2 text-orange-800">
          <BellCheck className="w-5 h-5 text-orange-600" />
          <div>
            <p className="text-sm font-semibold">You're on the list!</p>
            <p className="text-xs text-orange-600">We'll notify you when this item is back in stock.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-orange-600" />
            <p className="text-sm font-semibold text-orange-800">Get Back in Stock Alert</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone number"
              className="flex-1 h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={submitting}
              className="flex-shrink-0 h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
            >
              {submitting ? '...' : 'Notify me'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────

interface ProductDetailClientProps {
  product: ProductWithDetails
}

const TABS = ['Description', 'Reviews', 'Delivery Info'] as const
type Tab = typeof TABS[number]

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { user } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)

  const isWholesale = user?.accountType === 'WHOLESALE'

  // ─── Pricing setup ───────────────────────────────────────────────────
  const variant = product.variants[0]
  const stockAvailable = variant?.availableStock ?? 0

  function buildUnitOptions(): UnitOption[] {
    const opts: UnitOption[] = []
    if (!variant) return opts

    const unitPrice = Number(isWholesale ? variant.wholesalePrice : variant.retailPrice)
    const unitsPerDozen = variant.unitsPerDozen ?? 12
    const unitsPerCase = variant.unitsPerCase ?? 24

    opts.push({ unitType: 'UNIT', label: 'Unit', price: unitPrice, unitsPerPack: 1 })

    const dozenRule = product.pricingRules?.find((r) => r.unitType === 'DOZEN' && r.isActive)
    const caseRule = product.pricingRules?.find((r) => r.unitType === 'CASE' && r.isActive)

    if (dozenRule) {
      opts.push({
        unitType: 'DOZEN',
        label: `Dozen (${unitsPerDozen})`,
        price: Number(dozenRule.price),
        unitsPerPack: unitsPerDozen,
      })
    }

    if (caseRule) {
      const caseTotalPrice = Number(caseRule.price)
      const saving = unitPrice * unitsPerCase - caseTotalPrice
      opts.push({
        unitType: 'CASE',
        label: caseRule.label ?? `Case (${unitsPerCase})`,
        price: caseTotalPrice,
        unitsPerPack: unitsPerCase,
        isBestValue: saving > 0,
      })
    }

    return opts
  }

  const unitOptions = buildUnitOptions()

  const [selectedUnit, setSelectedUnit] = useState<UnitOption['unitType']>('UNIT')
  const [qty, setQty] = useState(1)
  const [activeTab, setActiveTab] = useState<Tab>('Description')
  const [imageIdx, setImageIdx] = useState(0)
  const [stickyVisible, setStickyVisible] = useState(false)
  const mainBtnRef = useRef<HTMLButtonElement>(null)

  const currentOption = unitOptions.find((o) => o.unitType === selectedUnit) ?? unitOptions[0]
  const displayPrice = currentOption?.price ?? 0
  const isLowStock = stockAvailable > 0 && stockAvailable < 10
  const isOutOfStock = stockAvailable === 0

  // Local pricing nudge (static, based on unit selection)
  function computeNudge(): string | null {
    if (selectedUnit === 'UNIT' && unitOptions.find((o) => o.unitType === 'DOZEN')) {
      const dozenOpt = unitOptions.find((o) => o.unitType === 'DOZEN')!
      const unitOpt = unitOptions.find((o) => o.unitType === 'UNIT')!
      const needed = 12 - qty
      if (needed > 0 && needed < 12) {
        const saving = unitOpt.price * 12 - dozenOpt.price
        return `Add ${needed} more to unlock dozen pricing → save ${formatLKRShort(saving)}`
      }
    }
    if (selectedUnit === 'DOZEN' && unitOptions.find((o) => o.unitType === 'CASE')) {
      const caseOpt = unitOptions.find((o) => o.unitType === 'CASE')!
      return `Buy a full case for better savings → ${formatLKRShort(caseOpt.price)}`
    }
    return null
  }

  const nudge = computeNudge()

  // Fire ViewContent pixel event once when product page loads
  useEffect(() => {
    trackViewProduct({
      id: product.id,
      name: product.name,
      price: Number(variant ? (isWholesale ? variant.wholesalePrice : variant.retailPrice) : 0),
      category: product.category?.name,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  // Sticky bar visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 },
    )
    if (mainBtnRef.current) observer.observe(mainBtnRef.current)
    return () => observer.disconnect()
  }, [])

  function handleAddToCart() {
    if (!variant || isOutOfStock) return
    addItem({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      brandName: product.brand.name,
      slug: product.slug,
      imageUrl: product.images[0]?.url ?? null,
      unitType: selectedUnit,
      qty,
      unitPrice: displayPrice,
      unitLabel: currentOption?.label ?? 'Unit',
      unitsPerPack: currentOption?.unitsPerPack ?? 1,
    })
    toast.success(`${product.name} added to cart!`, { icon: '🛒' })
  }

  const whatsappUrl = buildWhatsAppUrl(
    '94771234567',
    `Hi HealPlace! I'd like to order: ${product.name} (${qty} × ${currentOption?.label ?? 'unit'})`,
  )

  const images =
    product.images.length > 0
      ? product.images
      : [
          {
            id: 'placeholder',
            url: '',
            alt: product.name,
            isPrimary: true,
            sortOrder: 0,
            variantId: null,
            productId: product.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 py-3 flex items-center gap-1.5">
          <Link href="/" className="hover:text-brand-600">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-600">
            Products
          </Link>
          {product.category && (
            <>
              <span>/</span>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-brand-600"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-900 truncate max-w-[120px]">{product.name}</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="lg:grid lg:grid-cols-2 lg:gap-10">
          {/* ── LEFT: Image gallery ──────────────────────────────────── */}
          <div className="mb-6 lg:mb-0">
            {/* Main image */}
            <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3">
              {images[imageIdx]?.url ? (
                <Image
                  src={images[imageIdx].url}
                  alt={images[imageIdx].alt ?? product.name}
                  fill
                  priority
                  className="object-contain p-4"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-8xl text-gray-200">
                  📦
                </div>
              )}

              {/* Gallery nav */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImageIdx((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => setImageIdx((i) => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setImageIdx(idx)}
                    className={cn(
                      'relative w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all',
                      idx === imageIdx ? 'border-brand-600' : 'border-gray-200',
                    )}
                  >
                    {img.url && (
                      <Image
                        src={img.url}
                        alt={img.alt ?? ''}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Product info ──────────────────────────────────── */}
          <div>
            {/* Brand + name */}
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">
              {product.brand.name}
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight mb-2">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < 4 ? 'fill-amber-400 text-amber-400' : 'fill-amber-200 text-amber-200',
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">4.5 · 127 reviews</span>
            </div>

            {/* Stock badge */}
            {isLowStock && (
              <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <AlertCircle className="w-3.5 h-3.5" />
                Only {stockAvailable} left in stock
              </div>
            )}
            {isOutOfStock && (
              <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <AlertCircle className="w-3.5 h-3.5" />
                Out of stock
              </div>
            )}

            {/* Back in stock subscribe (shown only when out of stock) */}
            {variant && <BackInStockAlert variantId={variant.id} isOutOfStock={isOutOfStock} />}

            {/* Unit selector */}
            {unitOptions.length > 1 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">
                  Buy by
                </p>
                <UnitSelector
                  options={unitOptions}
                  selected={selectedUnit}
                  onChange={(unitType) => setSelectedUnit(unitType)}
                />
              </div>
            )}

            {/* Price display */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {formatLKRShort(displayPrice)}
                </span>
                {currentOption && (
                  <span className="text-sm text-gray-500">
                    per {currentOption.label.toLowerCase()}
                  </span>
                )}
              </div>
              {isWholesale && (
                <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  Wholesale price
                </span>
              )}
            </div>

            {/* Pricing nudge — local (static) */}
            {nudge && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4 text-xs text-amber-800 font-medium">
                <span className="text-base leading-none">💡</span>
                {nudge}
              </div>
            )}

            {/* Pricing nudge — API-driven (when no local nudge exists) */}
            {variant && !nudge && (
              <ApiPricingNudge variantId={variant.id} qty={qty} unitType={selectedUnit} />
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-sm font-medium text-gray-700">Qty</span>
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-target"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-semibold text-gray-900 text-base">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-target"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-gray-500">
                Total: <strong>{formatLKRShort(displayPrice * qty)}</strong>
              </span>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3 mb-6">
              <button
                ref={mainBtnRef}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={cn(
                  'w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all touch-target',
                  isOutOfStock
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-700 active:scale-95 text-white shadow-md shadow-brand-200',
                )}
              >
                <ShoppingCart className="w-5 h-5" />
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl border-2 border-[#25D366] text-[#128C7E] font-semibold flex items-center justify-center gap-2 hover:bg-green-50 transition-all touch-target"
              >
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                Order via WhatsApp
              </a>
            </div>

            {/* Trust strip */}
            <div className="flex items-center justify-around py-3 border border-gray-100 rounded-xl bg-gray-50 mb-6">
              {[
                { icon: ShieldCheck, label: 'Secure' },
                { icon: Truck, label: 'Fast Delivery' },
                { icon: RotateCcw, label: '7-day Returns' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <Icon className="w-4 h-4 text-brand-600" />
                  <span className="text-[10px] text-gray-600 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* SKU / unit info */}
            {variant?.sku && <p className="text-xs text-gray-400">SKU: {variant.sku}</p>}
          </div>
        </div>

        {/* Tabs: Description / Reviews / Delivery */}
        <div className="mt-10 border-t border-gray-100 pt-8">
          <div className="flex border-b border-gray-200 mb-6 gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors -mb-px',
                  activeTab === tab
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Description' && (
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
              {product.description ? (
                <p>{product.description}</p>
              ) : (
                <p className="text-gray-400 italic">No description available.</p>
              )}
            </div>
          )}

          {activeTab === 'Reviews' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⭐</div>
              <p className="text-gray-600 font-medium">4.5 out of 5</p>
              <p className="text-sm text-gray-400">Based on 127 reviews</p>
              <p className="text-sm text-gray-400 mt-4">Reviews coming soon. Be the first to review!</p>
            </div>
          )}

          {activeTab === 'Delivery Info' && (
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex gap-3">
                <Truck className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Delivery Zones</p>
                  <p>Colombo & suburbs: next business day. Outstation: 2-3 days.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Delivery Fees</p>
                  <p>Standard: LKR 450. Free delivery on orders over LKR 5,000.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <RotateCcw className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Returns</p>
                  <p>7-day returns on unopened products. Contact us via WhatsApp to initiate.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Frequently bought together */}
        {variant && <FrequentlyBoughtTogether variantId={variant.id} />}
      </div>

      {/* Sticky Add to Cart Bar */}
      {stickyVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 px-4 py-3 shadow-2xl safe-area-bottom">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">{product.name}</p>
              <p className="font-bold text-gray-900">{formatLKRShort(displayPrice * qty)}</p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-shrink-0 h-12 px-6 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed touch-target"
            >
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
