'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Loader2, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

interface RevenuePoint {
  date: string
  revenue: number
  orders: number
  margin?: number
}

interface TopProduct {
  name: string
  revenue: number
  units: number
  margin?: number
}

interface TopCustomer {
  name: string
  email: string
  totalSpend: number
  orderCount: number
}

interface ChannelBreakdown {
  source: string
  revenue: number
  orders: number
}

interface AnalyticsData {
  revenueChart: RevenuePoint[]
  topProducts: TopProduct[]
  topCustomers: TopCustomer[]
  channelBreakdown: ChannelBreakdown[]
}

const CHANNEL_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c']

export default function AnalyticsPage() {
  const { token, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      router.replace('/dashboard')
    }
  }, [user, router])

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [revenue, products, customers, channels] = await Promise.all([
        apiGet<RevenuePoint[]>(`/analytics/revenue?from=${dateFrom}&to=${dateTo}`, token),
        apiGet<TopProduct[]>(`/analytics/top-products?from=${dateFrom}&to=${dateTo}`, token),
        apiGet<TopCustomer[]>(`/analytics/top-customers?from=${dateFrom}&to=${dateTo}`, token),
        apiGet<ChannelBreakdown[]>(`/analytics/channels?from=${dateFrom}&to=${dateTo}`, token),
      ])
      setData({
        revenueChart: Array.isArray(revenue) ? revenue : [],
        topProducts: Array.isArray(products) ? products : [],
        topCustomers: Array.isArray(customers) ? customers : [],
        channelBreakdown: Array.isArray(channels) ? channels : [],
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [token, dateFrom, dateTo])

  useEffect(() => {
    load()
  }, [load])

  if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={22} className="text-brand-600" />
            Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Revenue insights and performance</p>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-300" size={32} />
        </div>
      ) : (
        <>
          {/* Revenue chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-5">Revenue Over Time</h2>
            {(data?.revenueChart.length ?? 0) === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No data for selected range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data?.revenueChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(v) => format(new Date(v), 'MMM d')}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip
                    formatter={(val: number, name: string) =>
                      name === 'revenue' || name === 'margin'
                        ? [formatCurrency(val), name]
                        : [val, name]
                    }
                    labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                  {isSuperAdmin && (
                    <Line
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="margin"
                      name="Margin"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="4 2"
                    />
                  )}
                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="2 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top products */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Top Products</h2>
              {(data?.topProducts.length ?? 0) === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No data.</p>
              ) : (
                <div className="space-y-1">
                  {data?.topProducts.slice(0, 8).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-semibold">{formatCurrency(p.revenue)}</p>
                        <p className="text-xs text-gray-400">{p.units} units</p>
                        {isSuperAdmin && p.margin != null && (
                          <p className="text-xs text-blue-600">Margin: {formatCurrency(p.margin)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top customers */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Top Customers</h2>
              {(data?.topCustomers.length ?? 0) === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No data.</p>
              ) : (
                <div className="space-y-1">
                  {data?.topCustomers.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-semibold">{formatCurrency(c.totalSpend)}</p>
                        <p className="text-xs text-gray-400">{c.orderCount} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Channel breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-5">Channel Breakdown</h2>
            {(data?.channelBreakdown.length ?? 0) === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No data.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data?.channelBreakdown}
                      dataKey="revenue"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ source, percent }) =>
                        `${source} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {data?.channelBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {data?.channelBreakdown.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }}
                        />
                        <span className="font-medium">{c.source}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(c.revenue)}</span>
                        <span className="text-gray-400 ml-2">{c.orders} orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
