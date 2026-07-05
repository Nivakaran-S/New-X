'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Users,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiGet } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import type { DashboardSummary, Role } from '@/types'

function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

// Roles that can see revenue
const CAN_SEE_REVENUE: Role[] = ['MANAGER', 'SUPER_ADMIN']
// Roles that can see margins / cost data
const CAN_SEE_MARGINS: Role[] = ['SUPER_ADMIN']

interface SummaryCard {
  label: string
  value: string
  icon: React.ElementType
  color: string
}

export default function EodPage() {
  const { token, user } = useAuthStore()
  const [date, setDate] = useState(formatDate(new Date()))
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const canSeeRevenue = user ? CAN_SEE_REVENUE.includes(user.role) : false
  const canSeeMargins = user ? CAN_SEE_MARGINS.includes(user.role) : false

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const summary = await apiGet<DashboardSummary>(
        `/analytics/dashboard?date=${date}`,
        token ?? undefined,
      )
      setData(summary)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [date, token])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const cards: SummaryCard[] = [
    {
      label: "Today's Orders",
      value: data ? String(data.todayOrders) : '—',
      icon: ShoppingBag,
      color: 'text-blue-400 bg-blue-500/10',
    },
    ...(canSeeRevenue
      ? [
          {
            label: "Today's Revenue",
            value: data ? formatLKR(data.todayRevenue) : '—',
            icon: DollarSign,
            color: 'text-green-400 bg-green-500/10',
          },
          {
            label: 'Month Revenue',
            value: data ? formatLKR(data.thisMonthRevenue) : '—',
            icon: TrendingUp,
            color: 'text-brand-400 bg-brand-500/10',
          },
        ]
      : []),
    {
      label: 'Total Customers',
      value: data ? String(data.totalCustomers) : '—',
      icon: Users,
      color: 'text-purple-400 bg-purple-500/10',
    },
    ...(canSeeRevenue
      ? [
          {
            label: 'Month Orders',
            value: data ? String(data.thisMonthOrders) : '—',
            icon: BarChart3,
            color: 'text-amber-400 bg-amber-500/10',
          },
        ]
      : []),
  ]

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">End of Day Report</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Daily transaction summary
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={formatDate(new Date())}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
          />
          <button
            onClick={fetchData}
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">
              {loading ? (
                <span className="inline-block w-16 h-6 bg-slate-700 rounded animate-pulse" />
              ) : (
                value
              )}
            </p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Top products (visible to managers+) */}
      {canSeeRevenue && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-white">Top Products</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 h-4 bg-slate-700 rounded animate-pulse" />
                  <div className="w-24 h-4 bg-slate-700 rounded animate-pulse" />
                </div>
              ))
            ) : data?.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <span className="text-xs font-bold text-slate-600 w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.units} units sold
                    </p>
                  </div>
                  {canSeeRevenue && (
                    <span className="text-sm font-semibold text-green-400 tabular-nums">
                      {formatLKR(p.revenue)}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-slate-600 text-sm">
                No data for this date
              </div>
            )}
          </div>
        </div>
      )}

      {/* Low stock alert */}
      {canSeeRevenue && data && data.lowStockCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-none">
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">
              {data.lowStockCount} product
              {data.lowStockCount !== 1 ? 's' : ''} low on stock
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Review inventory to avoid stockouts
            </p>
          </div>
        </div>
      )}

      {/* Cashier summary (always visible) */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">
          Session Summary — {date}
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400">Cash transactions</span>
            <span className="text-white font-medium">
              {loading ? '…' : (data?.todayOrders ?? '—')}
            </span>
          </div>
          {canSeeRevenue && (
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Cash collected</span>
              <span className="text-green-400 font-semibold tabular-nums">
                {loading ? '…' : data ? formatLKR(data.todayRevenue) : '—'}
              </span>
            </div>
          )}
        </div>
        {!canSeeRevenue && (
          <p className="text-xs text-slate-600 pt-2">
            Revenue figures are available to managers only.
          </p>
        )}
      </div>
    </div>
  )
}
