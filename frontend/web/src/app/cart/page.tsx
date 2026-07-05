'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight, Tag } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { formatLKRShort } from '@/lib/utils'
import type { UnitType } from '@healplace/types'

const FREE_DELIVERY_THRESHOLD = 5000
const DELIVERY_FEE = 450

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, itemCount } = useCartStore()
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')

  const sub = subtotal()
  const count = itemCount()
  const amountToFree = Math.max(0, FREE_DELIVERY_THRESHOLD - sub)
  const deliveryFee = sub >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = sub + deliveryFee
  const freeDeliveryProgress = Math.min(100, (sub / FREE_DELIVERY_THRESHOLD) * 100)

  if (count === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Add some products to get started!</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-brand-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-brand-700 transition-colors"
        >
          <ShoppingBag className="w-5 h-5" />
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Cart ({count} {count === 1 ? 'item' : 'items'})
      </h1>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4 mb-6 lg:mb-0">
          {/* Free delivery progress */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
            {amountToFree > 0 ? (
              <>
                <p className="text-sm font-medium text-brand-800 mb-2">
                  Add <strong>{formatLKRShort(amountToFree)}</strong> more for free delivery! 🚚
                </p>
                <div className="h-2 bg-brand-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all"
                    style={{ width: `${freeDeliveryProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-brand-700">
                🎉 You qualify for free delivery!
              </p>
            )}
          </div>

          {/* Items */}
          {items.map((item) => {
            const lineTotal = item.unitPrice * item.qty

            return (
              <div
                key={`${item.variantId}-${item.unitType}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3"
              >
                {/* Image */}
                <Link
                  href={`/products/${item.slug}`}
                  className="relative w-20 h-20 flex-shrink-0 rounded-lg bg-gray-50 overflow-hidden"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">📦</div>
                  )}
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">{item.brandName}</p>
                  <Link href={`/products/${item.slug}`}>
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1 hover:text-brand-600">
                      {item.productName}
                    </h3>
                  </Link>
                  <p className="text-xs text-gray-500 mb-2">{item.unitLabel}</p>

                  <div className="flex items-center justify-between gap-2">
                    {/* Qty controls */}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQty(item.variantId, item.unitType as UnitType, item.qty - 1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors touch-target"
                        aria-label="Decrease"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.variantId, item.unitType as UnitType, item.qty + 1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors touch-target"
                        aria-label="Increase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <span className="text-sm font-bold text-gray-900">
                      {formatLKRShort(lineTotal)}
                    </span>
                  </div>

                  {/* Pricing nudge per item */}
                  {item.unitType === 'UNIT' && item.qty >= 8 && item.qty < 12 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-2">
                      💡 Add {12 - item.qty} more for dozen pricing
                    </p>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.variantId, item.unitType as UnitType)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors touch-target"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}

          {/* Continue shopping */}
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm text-brand-600 hover:underline py-2"
          >
            ← Continue Shopping
          </Link>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
            <h2 className="text-base font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal ({count} items)</span>
                <span className="font-medium">{formatLKRShort(sub)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  Delivery
                  <span className="text-xs text-gray-400">(estimated)</span>
                </span>
                <span className={deliveryFee === 0 ? 'text-brand-600 font-semibold' : 'font-medium'}>
                  {deliveryFee === 0 ? 'FREE' : formatLKRShort(deliveryFee)}
                </span>
              </div>

              {/* Promo code */}
              <div>
                <button
                  onClick={() => setPromoOpen(!promoOpen)}
                  className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Have a promo code?
                </button>
                {promoOpen && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button className="px-3 h-9 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
                      Apply
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-gray-900">{formatLKRShort(total)}</span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Actual delivery fee confirmed at checkout
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full h-14 bg-brand-600 hover:bg-brand-700 text-white font-bold text-base rounded-xl transition-all active:scale-95 shadow-md shadow-brand-200 mb-3 touch-target"
            >
              Proceed to Checkout
              <ChevronRight className="w-5 h-5" />
            </Link>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span>🔒 Secure checkout</span>
              <span>✅ No hidden fees</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
