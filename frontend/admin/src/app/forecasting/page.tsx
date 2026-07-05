'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface RestockAlert {
  id: string
  productName: string
  variantName?: string
  sku?: string
  currentStock: number
  forecastDemand14d: number
  daysUntilStockout: number
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
}

const URGENCY_BADGE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-yellow-100 text-yellow-700',
}

const URGENCY_SORT: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

export default function ForecastingPage() {
  const { token } = useAuthStore()
  const [alerts, setAlerts] = useState<RestockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<RestockAlert[]>('/forecasting/alerts', token)
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a, b) => (URGENCY_SORT[a.urgency] ?? 3) - (URGENCY_SORT[b.urgency] ?? 3),
      )
      setAlerts(sorted)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load forecasting alerts')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function handleRunForecast() {
    if (!token) return
    setRunning(true)
    try {
      await apiPost('/forecasting/run', {}, token)
      toast.success('Forecast run initiated — data will refresh shortly')
      setTimeout(() => load(), 3000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to run forecast')
    } finally {
      setRunning(false)
    }
  }

  const filtered = urgencyFilter === 'ALL' ? alerts : alerts.filter((a) => a.urgency === urgencyFilter)

  const highCount = alerts.filter((a) => a.urgency === 'HIGH').length
  const medCount = alerts.filter((a) => a.urgency === 'MEDIUM').length
  const lowCount = alerts.filter((a) => a.urgency === 'LOW').length

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (row) => {
        const a = row as unknown as RestockAlert
        return (
          <div>
            <p className="font-medium text-gray-900">{a.productName}</p>
            {a.variantName && <p className="text-xs text-gray-400">{a.variantName}</p>}
            {a.sku && <p className="text-xs text-gray-300">{a.sku}</p>}
          </div>
        )
      },
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      sortable: true,
      render: (row) => {
        const a = row as unknown as RestockAlert
        return (
          <span className={`font-semibold ${a.currentStock === 0 ? 'text-red-600' : a.currentStock < 10 ? 'text-orange-600' : 'text-gray-900'}`}>
            {a.currentStock}
          </span>
        )
      },
    },
    {
      key: 'forecastDemand14d',
      header: '14-Day Forecast',
      sortable: true,
      render: (row) => {
        const a = row as unknown as RestockAlert
        return <span className="text-gray-700">{a.forecastDemand14d}</span>
      },
    },
    {
      key: 'daysUntilStockout',
      header: 'Days to Stockout',
      sortable: true,
      render: (row) => {
        const a = row as unknown as RestockAlert
        const val = a.daysUntilStockout
        const cls = val <= 3 ? 'text-red-600 font-bold' : val <= 7 ? 'text-orange-600 font-medium' : 'text-yellow-700'
        return <span className={cls}>{val === 0 ? 'Out of stock' : `${val} days`}</span>
      },
    },
    {
      key: 'urgency',
      header: 'Urgency',
      sortable: true,
      render: (row) => {
        const a = row as unknown as RestockAlert
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_BADGE[a.urgency] ?? 'bg-gray-100 text-gray-600'}`}>
            {a.urgency}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restock Forecasting</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI-powered demand forecasting and restock alerts</p>
        </div>
        <button
          onClick={handleRunForecast}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Run Forecast Now
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <AlertTriangle size={20} className="text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{highCount}</p>
            <p className="text-xs text-red-600 font-medium">Critical (HIGH)</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <AlertTriangle size={20} className="text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-700">{medCount}</p>
            <p className="text-xs text-orange-600 font-medium">Medium</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <AlertTriangle size={20} className="text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-700">{lowCount}</p>
            <p className="text-xs text-yellow-600 font-medium">Low</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((u) => (
          <button
            key={u}
            onClick={() => setUrgencyFilter(u)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              urgencyFilter === u ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {u}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No restock alerts. Inventory levels are healthy."
      />
    </div>
  )
}
