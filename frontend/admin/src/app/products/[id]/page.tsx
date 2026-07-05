'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { ArrowLeft, Edit, Package, Tag, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface PricingRule {
  id: string
  unitType?: string
  minQty?: number
  price: number
}

interface ProductVariant {
  id: string
  name?: string
  sku?: string
  barcode?: string
  retailPrice?: number
  wholesalePrice?: number
  costPrice?: number
  stock?: number
  stockLevel?: number
}

interface Product {
  id: string
  name: string
  sku?: string
  brand?: string
  category?: string | { name: string }
  description?: string
  isActive: boolean
  images?: string[]
  imageUrls?: string[]
  variants?: ProductVariant[]
  pricingRules?: PricingRule[]
}

function formatPrice(n?: number) {
  if (n == null) return '—'
  return `₦${n.toLocaleString()}`
}

function getStock(v: ProductVariant) {
  const s = v.stock ?? v.stockLevel
  if (s == null) return '—'
  return s
}

function getCategoryName(cat?: string | { name: string }): string {
  if (!cat) return '—'
  if (typeof cat === 'string') return cat
  return cat.name || '—'
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { token } = useAuthStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token || !id) return
    setLoading(true)
    try {
      const data = await apiGet<Product>(`/products/${id}`, token)
      setProduct(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Link href="/products" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit">
          <ArrowLeft size={14} />
          Back to Products
        </Link>
        <div className="text-center py-16 text-gray-400">Product not found.</div>
      </div>
    )
  }

  const images = product.images ?? product.imageUrls ?? []
  const variants = product.variants ?? []
  const pricingRules = product.pricingRules ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/products"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit"
          >
            <ArrowLeft size={14} />
            Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {product.sku && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">SKU: {product.sku}</span>}
            {product.brand && <span>{product.brand}</span>}
            {product.category && <span>{getCategoryName(product.category)}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {product.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <Link
          href={`/products/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Edit size={15} />
          Edit Product
        </Link>
      </div>

      {/* Description */}
      {product.description && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <ImageIcon size={15} />
            Images
          </h2>
          <div className="flex flex-wrap gap-3">
            {images.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Product image ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:border-brand-400 transition-colors"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Variants table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <Package size={15} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">
            Variants
            <span className="ml-1.5 text-xs text-gray-400 font-normal">({variants.length})</span>
          </h2>
        </div>
        {variants.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">No variants found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'SKU', 'Barcode', 'Retail Price', 'Wholesale Price', 'Cost Price', 'Stock'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.sku || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.barcode || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{formatPrice(v.retailPrice)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatPrice(v.wholesalePrice)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatPrice(v.costPrice)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${Number(getStock(v)) === 0 ? 'text-red-600' : 'text-gray-800'}`}>
                        {getStock(v)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pricing rules table */}
      {pricingRules.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Tag size={15} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              Pricing Rules
              <span className="ml-1.5 text-xs text-gray-400 font-normal">({pricingRules.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Unit Type', 'Min Qty', 'Price'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pricingRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{rule.unitType || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{rule.minQty ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{formatPrice(rule.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
