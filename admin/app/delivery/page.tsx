'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Shipment {
  id: string
  orderId: string
  orderNumber?: string
  customerName?: string
  provider?: string
  vehicle?: string
  status: string
  estimatedFee?: number
  createdAt: string
}

const STATUS_TABS = ['ALL', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED']

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

export default function DeliveryPage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<Shipment[]>('/delivery/shipments', token)
      setShipments(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load shipments')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const filtered = activeTab === 'ALL'
    ? shipments
    : shipments.filter((s) => s.status === activeTab)

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (row) => {
        const s = row as unknown as Shipment
        return <span className="font-mono text-xs">#{s.orderNumber ?? s.orderId.slice(0, 8)}</span>
      },
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (row) => {
        const s = row as unknown as Shipment
        return <span className="text-sm text-gray-900">{s.customerName ?? '—'}</span>
      },
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => {
        const s = row as unknown as Shipment
        return <span className="text-sm text-gray-600">{s.provider ?? '—'}</span>
      },
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (row) => {
        const s = row as unknown as Shipment
        return <span className="text-sm text-gray-600">{s.vehicle ?? '—'}</span>
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = row as unknown as Shipment
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {s.status.replace(/_/g, ' ')}
          </span>
        )
      },
    },
    {
      key: 'estimatedFee',
      header: 'Est. Fee',
      sortable: true,
      render: (row) => {
        const s = row as unknown as Shipment
        return s.estimatedFee != null
          ? <span className="text-sm text-gray-700">₦{s.estimatedFee.toLocaleString()}</span>
          : <span className="text-gray-300">—</span>
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => {
        const s = row as unknown as Shipment
        return <span className="text-xs text-gray-500">{formatDate(s.createdAt)}</span>
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery</h1>
        <p className="text-gray-500 text-sm mt-0.5">{filtered.length} shipment{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'ALL' ? shipments.length : shipments.filter((s) => s.status === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.replace(/_/g, ' ')}
              {!loading && (
                <span className="ml-1.5 text-xs text-gray-400">({count})</span>
              )}
            </button>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        onRowClick={(row) => router.push(`/delivery/${(row as unknown as Shipment).id}`)}
        loading={loading}
        emptyMessage="No shipments found."
      />
    </div>
  )
}
