'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'
import { Search, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const ORDER_STATUSES = [
  'ALL',
  'PENDING',
  'PENDING_VERIFICATION',
  'CONFIRMED',
  'PROCESSING',
  'PRE_ORDER',
  'CANCELLED',
  'REFUNDED',
]

const ORDER_SOURCES = ['ALL', 'POS', 'WEBSITE', 'WHATSAPP', 'PHONE', 'API']

export default function OrdersPage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadOrders = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (sourceFilter !== 'ALL') params.set('source', sourceFilter)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const data = await apiGet<OrderWithDetails[]>(`/orders?${params}`, token)
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter, sourceFilter, dateFrom, dateTo])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filtered = orders.filter((o) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.customer?.email?.toLowerCase().includes(q)
    )
  })

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs">#{(row as unknown as OrderWithDetails).orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => {
        const o = row as unknown as OrderWithDetails
        return o.customer?.name ?? o.customer?.email ?? 'Guest'
      },
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      sortable: true,
      render: (row) => formatCurrency(Number((row as unknown as OrderWithDetails).totalAmount)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={(row as unknown as OrderWithDetails).status} type="order" />,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (row) => {
        const o = row as unknown as OrderWithDetails
        const ps = o.payments?.[0]?.status ?? 'UNPAID'
        return <StatusBadge status={ps} type="payment" />
      },
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {(row as unknown as OrderWithDetails).source}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-gray-500 text-xs">
          {formatDateTime((row as unknown as OrderWithDetails).createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">{filtered.length} orders found</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {ORDER_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All Sources' : s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        onRowClick={(row) => router.push(`/orders/${(row as unknown as OrderWithDetails).id}`)}
        loading={loading}
        emptyMessage="No orders match your filters."
      />
    </div>
  )
}
