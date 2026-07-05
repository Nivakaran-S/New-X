'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Plus, Loader2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Coupon {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  validFrom: string
  validUntil: string
  usedCount: number
  maxUses: number | null
  isActive: boolean
}

interface CreateCouponForm {
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: string
  validFrom: string
  validUntil: string
  maxUses: string
}

const EMPTY_FORM: CreateCouponForm = {
  code: '',
  type: 'PERCENTAGE',
  value: '',
  validFrom: '',
  validUntil: '',
  maxUses: '',
}

export default function CouponsPage() {
  const { token } = useAuthStore()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState<CreateCouponForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<Coupon[]>('/coupons', token)
      setCoupons(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setCreating(true)
    try {
      await apiPost('/coupons', {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
      }, token)
      toast.success('Coupon created')
      setShowDialog(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(coupon: Coupon) {
    if (!token) return
    setTogglingId(coupon.id)
    try {
      await apiPatch(`/coupons/${coupon.id}`, { isActive: !coupon.isActive }, token)
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c)),
      )
      toast.success(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update coupon')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(coupon: Coupon) {
    if (!token || !confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return
    setDeletingId(coupon.id)
    try {
      await apiDelete(`/coupons/${coupon.id}`, token)
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id))
      toast.success('Coupon deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete coupon')
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(s: string) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-gray-900">{(row as unknown as Coupon).code}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const c = row as unknown as Coupon
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.type === 'PERCENTAGE' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
            {c.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
          </span>
        )
      },
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      render: (row) => {
        const c = row as unknown as Coupon
        return (
          <span className="font-semibold text-green-700">
            {c.type === 'PERCENTAGE' ? `${c.value}%` : `₦${c.value.toLocaleString()}`}
          </span>
        )
      },
    },
    {
      key: 'validFrom',
      header: 'Valid From',
      render: (row) => <span className="text-xs text-gray-500">{formatDate((row as unknown as Coupon).validFrom)}</span>,
    },
    {
      key: 'validUntil',
      header: 'Valid Until',
      render: (row) => <span className="text-xs text-gray-500">{formatDate((row as unknown as Coupon).validUntil)}</span>,
    },
    {
      key: 'usedCount',
      header: 'Uses',
      sortable: true,
      render: (row) => {
        const c = row as unknown as Coupon
        return (
          <span className="text-sm text-gray-600">
            {c.usedCount}/{c.maxUses ?? '∞'}
          </span>
        )
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => {
        const c = row as unknown as Coupon
        const isToggling = togglingId === c.id
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(c) }}
            disabled={isToggling}
            className="flex items-center gap-1.5 text-sm"
          >
            {isToggling ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : c.isActive ? (
              <ToggleRight size={20} className="text-green-600" />
            ) : (
              <ToggleLeft size={20} className="text-gray-400" />
            )}
            <span className={c.isActive ? 'text-green-700' : 'text-gray-400'}>
              {c.isActive ? 'Active' : 'Inactive'}
            </span>
          </button>
        )
      },
    },
    {
      key: 'delete',
      header: '',
      render: (row) => {
        const c = row as unknown as Coupon
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(c) }}
            disabled={deletingId === c.id}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete coupon"
          >
            {deletingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-500 text-sm mt-0.5">{coupons.length} coupons total</p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          Create Coupon
        </button>
      </div>

      <DataTable
        columns={columns}
        data={coupons as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No coupons found."
      />

      {/* Create Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create Coupon</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. SAVE20"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'PERCENTAGE' | 'FIXED' }))}
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value {form.type === 'PERCENTAGE' ? '(%)' : '(₦)'}
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.validFrom}
                    onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.validUntil}
                    onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (leave blank for unlimited)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                />
              </div>
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
