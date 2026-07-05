'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import {
  DollarSign,
  ShoppingBag,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DashboardSummary, OrderWithDetails } from '@/types'
import { format, subDays } from 'date-fns'

interface RevenuePoint {
  date: string
  revenue: number
  orders: number
}

interface DashboardData {
  summary: DashboardSummary
  recentOrders: OrderWithDetails[]
  revenueChart: RevenuePoint[]
  stockAlerts: { productName: string; daysLeft: number; stock: number }[]
  overduePayments: { orderId: string; customer: string; amount: number; daysOverdue: number }[]
}

export default function DashboardPage() {
  const { token } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    if (!token) return
    try {
      const from = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const to = format(new Date(), 'yyyy-MM-dd')
      const [dashboardData, revenueData] = await Promise.all([
        apiGet<DashboardData>('/analytics/dashboard', token),
        apiGet<RevenuePoint[]>(`/analytics/revenue?from=${from}&to=${to}`, token),
      ])
      setData({ ...dashboardData, revenueChart: revenueData })
    } catch {
      // show placeholder data so the page still renders
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const summary = data?.summary
  const recentOrders = data?.recentOrders ?? []
  const revenueChart = data?.revenueChart ?? []
  const stockAlerts = data?.stockAlerts ?? []
  const overduePayments = data?.overduePayments ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome back. Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={loading ? '—' : formatCurrency(summary?.todayRevenue ?? 0)}
          icon={<DollarSign size={18} />}
          trend={summary ? undefined : undefined}
        />
        <StatCard
          label="Orders Today"
          value={loading ? '—' : (summary?.todayOrders ?? 0)}
          icon={<ShoppingBag size={18} />}
        />
        <StatCard
          label="Pending Verification"
          value={loading ? '—' : (summary?.pendingVerification ?? 0)}
          icon={<Clock size={18} />}
          alert={(summary?.pendingVerification ?? 0) > 0}
          subLabel="Payment slips to review"
        />
        <StatCard
          label="Low Stock Items"
          value={loading ? '—' : (summary?.lowStockCount ?? 0)}
          icon={<AlertTriangle size={18} />}
          alert={(summary?.lowStockCount ?? 0) > 0}
          subLabel="Below reorder level"
        />
      </div>

      {/* Alerts row */}
      {(stockAlerts.length > 0 || overduePayments.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stockAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={15} />
                Stock-out Risk (running out within 3 days)
              </h3>
              <ul className="space-y-2">
                {stockAlerts.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-red-700 font-medium">{a.productName}</span>
                    <span className="text-red-600">{a.daysLeft}d left · {a.stock} units</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {overduePayments.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-semibold text-yellow-800 text-sm mb-3 flex items-center gap-2">
                <Clock size={15} />
                Overdue Payments
              </h3>
              <ul className="space-y-2">
                {overduePayments.slice(0, 5).map((p, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-yellow-800 font-medium">{p.customer}</span>
                    <span className="text-yellow-700">
                      {formatCurrency(p.amount)} · {p.daysOverdue}d overdue
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-600" />
            Revenue — Last 7 Days
          </h2>
        </div>
        {revenueChart.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            {loading ? 'Loading chart...' : 'No revenue data available.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(v) => format(new Date(v), 'MMM d')}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ fill: '#16a34a', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Order #', 'Customer', 'Amount', 'Status', 'Source', 'Time'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : recentOrders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => (window.location.href = `/orders/${order.id}`)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        #{order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {order.customer?.name ?? order.customer?.email ?? 'Guest'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(Number(order.totalAmount))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} type="order" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {order.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatRelativeTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
              {!loading && recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No recent orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
