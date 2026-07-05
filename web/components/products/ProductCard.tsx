'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Star } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useCartStore, useAuthStore } from '@/lib/store'
import { cn, formatLKRShort } from '@/lib/utils'

// Shape returned by GET /products list endpoint (server-serialized)
export interface ProductCardData {
  id: string
  slug: string
  name: string
  brandName: string
  imageUrl: string | null
  // Per-unit pricing
  retailPrice: number
  wholesalePrice: number
  // Multi-unit pricing (from pricingRules)
  dozenPrice: number | null
  casePrice: number | null
  availableStock: number
  variantId: string
  unit: string // e.g. "500ml", "1kg"
}

interface ProductCardProps {
  product: ProductCardData
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { user } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)
  const [adding, setAdding] = useState(false)

  const isWholesale = user?.accountType === 'WHOLESALE'
  const displayPrice = isWholesale ? product.wholesalePrice : product.retailPrice

  const isLowStock = product.availableStock > 0 && product.availableStock < 10
  const isOutOfStock = product.availableStock === 0

  function handleAddToCart() {
    if (isOutOfStock) return
    setAdding(true)
    addItem({
      variantId: product.variantId,
      productId: product.id,
      productName: product.name,
      brandName: product.brandName,
      slug: product.slug,
      imageUrl: product.imageUrl,
      unitType: 'UNIT',
      qty: 1,
      unitPrice: displayPrice,
      unitLabel: 'Unit',
      unitsPerPack: 1,
    })
    toast.success(`${product.name} added to cart!`)
    setTimeout(() => setAdding(false), 600)
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col',
        className,
      )}
    >
      {/* Image */}
      <Link href={`/products/${product.slug}`} className="relative block aspect-square bg-gray-50">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-4xl">
            📦
          </div>
        )}

        {/* Stock badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
              Out of stock
            </span>
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Only {product.availableStock} left
          </div>
        )}
        {isWholesale && (
          <div className="absolute top-2 right-2 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            WS Price
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">
          {product.brandName}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-2 hover:text-brand-600">
            {product.name}
          </h3>
        </Link>

        {/* Stars placeholder */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-[11px] text-gray-500">4.5 · 24 reviews</span>
        </div>

        {/* Pricing */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-base font-bold text-gray-900">
              {formatLKRShort(displayPrice)}
            </span>
            <span className="text-xs text-gray-500">/{product.unit}</span>
          </div>
          {product.dozenPrice && (
            <p className="text-[11px] text-gray-500 mb-2">
              Dozen: {formatLKRShort(product.dozenPrice)}
            </p>
          )}

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || adding}
            className={cn(
              'w-full h-9 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all touch-target',
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 active:scale-95 text-white',
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            {adding ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
