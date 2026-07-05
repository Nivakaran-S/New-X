'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPatch } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import type { ProductWithDetails } from '@healplace/types'
import { Plus, Search, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const { token, user } = useAuthStore()
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<ProductWithDetails[]>('/products?limit=200', token)
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category?.name).filter(Boolean)))]

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.brand?.name?.toLowerCase().includes(q)
    const matchCat = categoryFilter === 'ALL' || p.category?.name === categoryFilter
    return matchSearch && matchCat
  })

  async function handleToggleActive(product: ProductWithDetails) {
    if (!token) return
    setTogglingId(product.id)
    try {
      await apiPatch(`/products/${product.id}`, { isActive: !product.isActive }, token)
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p)),
      )
      toast.success(product.isActive ? 'Product deactivated' : 'Product activated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setTogglingId(null)
    }
  }

  const canSeeCost = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER'

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">{(row as unknown as ProductWithDetails).sku}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => {
        const p = row as unknown as ProductWithDetails
        return (
          <div>
            <p className="font-medium text-gray-900">{p.name}</p>
            {p.brand?.name && <p className="text-xs text-gray-400">{p.brand.name}</p>}
          </div>
        )
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => {
        const p = row as unknown as ProductWithDetails
        return (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {p.category?.name ?? '—'}
          </span>
        )
      },
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (row) => {
        const p = row as unknown as ProductWithDetails
        const total = p.variants?.reduce((s, v) => s + (v.totalStock ?? 0), 0) ?? 0
        return (
          <span className={total === 0 ? 'text-red-600 font-medium' : total < 10 ? 'text-yellow-600' : 'text-gray-700'}>
            {total}
          </span>
        )
      },
    },
    ...(canSeeCost
      ? [
          {
            key: 'costPrice',
            header: 'Cost Price',
            render: (row: Record<string, unknown>) => {
              const p = row as unknown as ProductWithDetails
              const cost = p.variants?.[0]?.costPrice
              return cost ? formatCurrency(Number(cost)) : '—'
            },
          } as Column<Record<string, unknown>>,
        ]
      : []),
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => {
        const p = row as unknown as ProductWithDetails
        const isToggling = togglingId === p.id
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleActive(p)
            }}
            disabled={isToggling}
            className="flex items-center gap-1.5 text-sm"
          >
            {isToggling ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : p.isActive ? (
              <ToggleRight size={20} className="text-green-600" />
            ) : (
              <ToggleLeft size={20} className="text-gray-400" />
            )}
            <span className={p.isActive ? 'text-green-700' : 'text-gray-400'}>
              {p.isActive ? 'Active' : 'Inactive'}
            </span>
          </button>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} products</p>
        </div>
        <button
          onClick={() => router.push('/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, SKU, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All Categories' : c}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        onRowClick={(row) => router.push(`/products/${(row as unknown as ProductWithDetails).id}/edit`)}
        loading={loading}
        emptyMessage="No products found."
      />
    </div>
  )
}
