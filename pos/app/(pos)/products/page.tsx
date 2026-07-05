'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Search,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiGet } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import type { ProductWithDetails, Role } from '@/types'

const ALLOWED_ROLES: Role[] = ['MANAGER', 'SUPER_ADMIN']

function formatLKR(amount: number | string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProductsPage() {
  const { token, user } = useAuthStore()
  const [products, setProducts] = useState<ProductWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const isAllowed = user && ALLOWED_ROLES.includes(user.role)

  const fetchProducts = useCallback(async () => {
    if (!isAllowed) return
    setLoading(true)
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : ''
      const data = await apiGet<ProductWithDetails[]>(
        `/products${q}`,
        token ?? undefined,
      )
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [search, token, isAllowed])

  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
  }

  if (!isAllowed) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Access Restricted</h2>
          <p className="text-slate-400 text-sm">
            Product management is available to managers only.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Products</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Stock levels overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={
              (process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003') +
              '/products'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Full Management
          </a>
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, SKU, barcode…"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Brand</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const variant = product.variants[0]
                const totalStock = variant
                  ? (variant as { totalStock?: number }).totalStock ?? 0
                  : 0
                const isLowStock = totalStock < 10
                const wholesalePrice = variant
                  ? Number(variant.wholesalePrice)
                  : 0

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white truncate max-w-[200px]">
                          {product.name}
                        </p>
                        {variant?.barcode && (
                          <p className="text-xs text-slate-500 font-mono">
                            {variant.barcode}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-400">
                        {product.sku}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {product.brand.name}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white font-medium">
                      {formatLKR(wholesalePrice)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`tabular-nums font-semibold ${
                          isLowStock ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          Low
                        </span>
                      ) : (
                        <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && products.length > 0 && (
        <p className="text-xs text-slate-600 text-center">
          Showing {products.length} product{products.length !== 1 ? 's' : ''}
          {search ? ` matching "${search}"` : ''}
        </p>
      )}
    </div>
  )
}
