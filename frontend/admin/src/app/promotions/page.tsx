'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Plus, Loader2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Promotion {
  id: string
  name: string
  description?: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  startDate: string
  endDate: string
  scope: 'ALL' | 'WHOLESALE' | 'RETAIL' | 'SPECIFIC_PRODUCTS'
  productIds?: string[]
  isActive: boolean
}

interface CreatePromotionForm {
  name: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: string
  startDate: string
  endDate: string
  scope: 'ALL' | 'WHOLESALE' | 'RETAIL' | 'SPECIFIC_PRODUCTS'
  productIds: string
}

const EMPTY_FORM: CreatePromotionForm = {
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  startDate: '',
  endDate: '',
  scope: 'ALL',
  productIds: '',
}

function formatDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PromotionsPage() {
  const { token } = useAuthStore()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState<CreatePromotionForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<Promotion[]>('/promotions', token)
      setPromotions(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setCreating(true)
    try {
      const productIds = form.productIds
        ? form.productIds.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      await apiPost('/promotions', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        scope: form.scope,
        productIds: productIds.length ? productIds : undefined,
      }, token)
      toast.success('Promotion created')
      setShowDialog(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create promotion')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(promo: Promotion) {
    if (!token) return
    setTogglingId(promo.id)
    try {
      await apiPatch(`/promotions/${promo.id}`, { isActive: !promo.isActive }, token)
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, isActive: !p.isActive } : p)),
      )
      toast.success(promo.isActive ? 'Promotion deactivated' : 'Promotion activated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update promotion')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(promo: Promotion) {
    if (!token || !confirm(`Delete promotion "${promo.name}"? This cannot be undone.`)) return
    setDeletingId(promo.id)
    try {
      await apiDelete(`/promotions/${promo.id}`, token)
      setPromotions((prev) => prev.filter((p) => p.id !== promo.id))
      toast.success('Promotion deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete promotion')
    } finally {
      setDeletingId(null)
    }
  }

  const scopeLabel: Record<string, string> = {
    ALL: 'All',
    WHOLESALE: 'Wholesale',
    RETAIL: 'Retail',
    SPECIFIC_PRODUCTS: 'Specific Products',
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-gray-900">{(row as unknown as Promotion).name}</span>
      ),
    },
    {
      key: 'discountType',
      header: 'Type',
      render: (row) => {
        const p = row as unknown as Promotion
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.discountType === 'PERCENTAGE' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
            {p.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
          </span>
        )
      },
    },
    {
      key: 'discountValue',
      header: 'Discount',
      sortable: true,
      render: (row) => {
        const p = row as unknown as Promotion
        return (
          <span className="font-semibold text-green-700">
            {p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `₦${p.discountValue.toLocaleString()}`}
          </span>
        )
      },
    },
    {
      key: 'startDate',
      header: 'Start',
      render: (row) => <span className="text-xs text-gray-500">{formatDate((row as unknown as Promotion).startDate)}</span>,
    },
    {
      key: 'endDate',
      header: 'End',
      render: (row) => <span className="text-xs text-gray-500">{formatDate((row as unknown as Promotion).endDate)}</span>,
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (row) => {
        const p = row as unknown as Promotion
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
            {scopeLabel[p.scope] ?? p.scope}
          </span>
        )
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => {
        const p = row as unknown as Promotion
        const isToggling = togglingId === p.id
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(p) }}
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
    {
      key: 'delete',
      header: '',
      render: (row) => {
        const p = row as unknown as Promotion
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(p) }}
            disabled={deletingId === p.id}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete promotion"
          >
            {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-gray-500 text-sm mt-0.5">{promotions.length} promotions total</p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          Create Promotion
        </button>
      </div>

      <DataTable
        columns={columns}
        data={promotions as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No promotions found."
      />

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create Promotion</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Summer Sale"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Optional description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.discountType}
                    onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' }))}
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value {form.discountType === 'PERCENTAGE' ? '(%)' : '(₦)'}
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.discountValue}
                    onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.scope}
                  onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as CreatePromotionForm['scope'] }))}
                >
                  <option value="ALL">All Customers</option>
                  <option value="WHOLESALE">Wholesale Only</option>
                  <option value="RETAIL">Retail Only</option>
                  <option value="SPECIFIC_PRODUCTS">Specific Products</option>
                </select>
              </div>
              {form.scope === 'SPECIFIC_PRODUCTS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product IDs (comma-separated)</label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
                    placeholder="uuid1, uuid2, uuid3"
                    value={form.productIds}
                    onChange={(e) => setForm((f) => ({ ...f, productIds: e.target.value }))}
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {creating && <Loader2 size={15} className="animate-spin" />}
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDialog(false); setForm(EMPTY_FORM) }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
