'use client'

import { Package } from 'lucide-react'
import type { ProductWithDetails, ProductVariant, Product, UnitType } from '@/types'

export type ProductVariantWithProduct = ProductVariant & { product: Product }

interface Props {
  product: ProductWithDetails
  onAdd: (
    variant: ProductVariantWithProduct,
    unitType: UnitType,
    price: number,
  ) => void
}

function formatLKR(amount: number | string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ProductSearchResult({ product, onAdd }: Props) {
  const variant = product.variants[0]
  if (!variant) return null

  const retailPrice =
    typeof variant.retailPrice === 'string'
      ? parseFloat(variant.retailPrice)
      : Number(variant.retailPrice)
  const wholesalePrice =
    typeof variant.wholesalePrice === 'string'
      ? parseFloat(variant.wholesalePrice)
      : Number(variant.wholesalePrice)

  const unitPrice = wholesalePrice
  const dozenPrice = wholesalePrice * (variant.unitsPerDozen ?? 12)
  const casePrice = wholesalePrice * (variant.unitsPerCase ?? 24)

  // Cast product: ProductWithDetails extends Product, so this is safe
  const variantWithProduct: ProductVariantWithProduct = {
    ...variant,
    product: product as unknown as Product,
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-none w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
          <Package className="w-5 h-5 text-slate-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {product.name}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {product.brand.name}
            {variant.barcode ? ` · ${variant.barcode}` : ''}
            {` · SKU: ${product.sku}`}
          </p>
          {product.variants.length > 1 && (
            <p className="text-xs text-slate-500 mt-0.5">
              {product.variants.length} variants
            </p>
          )}
        </div>
      </div>

      {/* Price buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onAdd(variantWithProduct, 'UNIT', unitPrice)}
          className="flex-1 flex flex-col items-center px-2 py-2 rounded-lg bg-slate-700 hover:bg-brand-600 hover:text-white text-slate-300 transition-colors text-center group"
        >
          <span className="text-[10px] font-medium text-slate-400 group-hover:text-brand-200 uppercase tracking-wide">
            Unit
          </span>
          <span className="text-xs font-bold mt-0.5">
            {formatLKR(unitPrice)}
          </span>
        </button>

        <button
          onClick={() => onAdd(variantWithProduct, 'DOZEN', dozenPrice)}
          className="flex-1 flex flex-col items-center px-2 py-2 rounded-lg bg-slate-700 hover:bg-brand-600 hover:text-white text-slate-300 transition-colors text-center group"
        >
          <span className="text-[10px] font-medium text-slate-400 group-hover:text-brand-200 uppercase tracking-wide">
            Dozen ×{variant.unitsPerDozen ?? 12}
          </span>
          <span className="text-xs font-bold mt-0.5">
            {formatLKR(dozenPrice)}
          </span>
        </button>

        <button
          onClick={() => onAdd(variantWithProduct, 'CASE', casePrice)}
          className="flex-1 flex flex-col items-center px-2 py-2 rounded-lg bg-slate-700 hover:bg-brand-600 hover:text-white text-slate-300 transition-colors text-center group"
        >
          <span className="text-[10px] font-medium text-slate-400 group-hover:text-brand-200 uppercase tracking-wide">
            Case ×{variant.unitsPerCase ?? 24}
          </span>
          <span className="text-xs font-bold mt-0.5">
            {formatLKR(casePrice)}
          </span>
        </button>
      </div>
    </div>
  )
}
