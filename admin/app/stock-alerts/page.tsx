'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiDelete, apiPost } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Loader2, Trash2, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

interface StockAlert {
  id: string
  variantId?: string
  variantName?: string
  productName?: string
  alertType: 'BACK_IN_STOCK' | 'PRE_ORDER'
  email?: string
  phone?: string
  userId?: string
  notifiedAt?: string | null
  createdAt: string
}

type FilterTab = 'PENDING' | 'NOTIFIED'

function formatDate(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function groupByVariant(alerts: StockAlert[]): Map<string, StockAlert[]> {
  const map = new Map<string, StockAlert[]>()
  for (const a of alerts) {
    const key = a.variantId ?? 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }
  return map
}

export default function StockAlertsPage() {
  const { token } = useAuthStore()
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('PENDING')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notifyingVariantId, setNotifyingVariantId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<StockAlert[]>('/stock-alerts', token)
      setAlerts(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load stock alerts')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleDelete(alert: StockAlert) {
    if (!token || !confirm('Delete this stock alert?')) return
    setDeletingId(alert.id)
    try {
      await apiDelete(`/stock-alerts/${alert.id}`, token)
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id))
      toast.success('Alert deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete alert')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleNotifyVariant(variantId: string) {
    if (!token) return
    setNotifyingVariantId(variantId)
    try {
      await apiPost(`/stock-alerts/notify/${variantId}`, {}, token)
      toast.success('Notifications triggered for variant')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger notifications')
    } finally {
      setNotifyingVariantId(null)
    }
  }

  const pendingAlerts = alerts.filter((a) => !a.notifiedAt)
  const notifiedAlerts = alerts.filter((a) => !!a.notifiedAt)
  const filtered = activeTab === 'PENDING' ? pendingAlerts : notifiedAlerts

  // Variant groups for pending — shown at top as a summary
  const variantGroups = activeTab === 'PENDING' ? groupByVariant(pendingAlerts) : null

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'PENDING', label: 'Pending', count: pendingAlerts.length },
    { key: 'NOTIFIED', label: 'Notified', count: notifiedAlerts.length },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'variantName',
      header: 'Variant / Product',
      sortable: true,
      render: (row) => {
        const a = row as unknown as StockAlert
        return (
          <span className="font-medium text-gray-900">
            {a.variantName || a.productName || a.variantId || '—'}
          </span>
        )
      },
    },
    {
      key: 'alertType',
      header: 'Type',
      render: (row) => {
        const a = row as unknown as StockAlert
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.alertType === 'BACK_IN_STOCK' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
            {a.alertType === 'BACK_IN_STOCK' ? 'Back in Stock' : 'Pre-Order'}
          </span>
        )
      },
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => {
        const a = row as unknown as StockAlert
        return <span className="text-sm text-gray-600">{a.email || '—'}</span>
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => {
        const a = row as unknown as StockAlert
        return <span className="text-sm text-gray-600">{a.phone || '—'}</span>
      },
    },
    {
      key: 'userId',
      header: 'User ID',
      render: (row) => {
        const a = row as unknown as StockAlert
        return a.userId ? (
          <span className="font-mono text-xs text-gray-500">{a.userId.slice(0, 8)}…</span>
        ) : (
          <span className="text-gray-300">—</span>
        )
      },
    },
    {
      key: 'notifiedAt',
      header: 'Notified At',
      sortable: true,
      render: (row) => {
        const a = row as unknown as StockAlert
        return a.notifiedAt ? (
          <span className="text-xs text-green-700">{formatDate(a.notifiedAt)}</span>
        ) : (
          <span className="text-xs text-yellow-600 font-medium">Pending</span>
        )
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500">{formatDate((row as unknown as StockAlert).createdAt)}</span>
      ),
    },
    {
      key: 'delete',
      header: '',
      render: (row) => {
        const a = row as unknown as StockAlert
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(a) }}
            disabled={deletingId === a.id}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete alert"
          >
            {deletingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Alerts</h1>
        <p className="text-gray-500 text-sm mt-0.5">{alerts.length} alerts total</p>
      </div>

      {/* Variant summary for pending */}
      {activeTab === 'PENDING' && variantGroups && variantGroups.size > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Pending by Variant</h2>
          <div className="space-y-2">
            {Array.from(variantGroups.entries()).map(([variantId, variantAlerts]) => {
              const sample = variantAlerts[0]
              const label = sample.variantName || sample.productName || variantId
              const isNotifying = notifyingVariantId === variantId
              return (
                <div key={variantId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{label}</span>
                    <span className="ml-2 text-xs text-gray-500">{variantAlerts.length} subscriber{variantAlerts.length !== 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={() => handleNotifyVariant(variantId)}
                    disabled={isNotifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60"
                  >
                    {isNotifying ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                    Notify All
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={`No ${activeTab.toLowerCase()} stock alerts.`}
      />
    </div>
  )
}
