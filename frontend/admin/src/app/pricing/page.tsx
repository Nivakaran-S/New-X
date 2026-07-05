'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPatch } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Loader2, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface PricingTier {
  id: string
  name: string
  discountPct: number
  minMonthlySpend: number
  userCount?: number
}

export default function PricingPage() {
  const { token } = useAuthStore()
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<PricingTier>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<PricingTier[]>('/pricing/tiers', token)
      setTiers(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load pricing tiers')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(tier: PricingTier) {
    setEditingId(tier.id)
    setEditValues({ name: tier.name, discountPct: tier.discountPct, minMonthlySpend: tier.minMonthlySpend })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({})
  }

  async function saveEdit(tier: PricingTier) {
    if (!token) return
    setSaving(true)
    try {
      await apiPatch(`/pricing/tiers/${tier.id}`, editValues, token)
      setTiers((prev) =>
        prev.map((t) => (t.id === tier.id ? { ...t, ...editValues } : t)),
      )
      toast.success('Tier updated')
      setEditingId(null)
      setEditValues({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tier')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Tier Name',
      sortable: true,
      render: (row) => {
        const t = row as unknown as PricingTier
        if (editingId === t.id) {
          return (
            <input
              className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={editValues.name ?? ''}
              onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="font-medium text-gray-900">{t.name}</span>
      },
    },
    {
      key: 'discountPct',
      header: 'Discount %',
      sortable: true,
      render: (row) => {
        const t = row as unknown as PricingTier
        if (editingId === t.id) {
          return (
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={editValues.discountPct ?? 0}
              onChange={(e) => setEditValues((v) => ({ ...v, discountPct: Number(e.target.value) }))}
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return (
          <span className="font-semibold text-green-700">{t.discountPct}%</span>
        )
      },
    },
    {
      key: 'minMonthlySpend',
      header: 'Min Monthly Spend',
      sortable: true,
      render: (row) => {
        const t = row as unknown as PricingTier
        if (editingId === t.id) {
          return (
            <input
              type="number"
              min={0}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={editValues.minMonthlySpend ?? 0}
              onChange={(e) => setEditValues((v) => ({ ...v, minMonthlySpend: Number(e.target.value) }))}
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return (
          <span className="text-gray-700">
            ₦{t.minMonthlySpend?.toLocaleString()}
          </span>
        )
      },
    },
    {
      key: 'userCount',
      header: 'Users',
      render: (row) => {
        const t = row as unknown as PricingTier
        return (
          <span className="text-sm text-gray-600">{t.userCount ?? 0}</span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const t = row as unknown as PricingTier
        if (editingId === t.id) {
          return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => saveEdit(t)}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium rounded-lg transition-colors"
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          )
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); startEdit(t) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
          >
            <Pencil size={12} />
            Edit
          </button>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing Tiers</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage wholesale discount tiers and spending thresholds</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-pulse h-20" />
            ))
          : tiers.map((tier) => (
              <div key={tier.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{tier.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{tier.discountPct}%</p>
                <p className="text-xs text-gray-500 mt-0.5">{tier.userCount ?? 0} users</p>
              </div>
            ))}
      </div>

      <DataTable
        columns={columns}
        data={tiers as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No pricing tiers found."
      />
    </div>
  )
}
