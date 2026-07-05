'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { ArrowLeft, ExternalLink, Loader2, Truck } from 'lucide-react'
import toast from 'react-hot-toast'

interface StatusHistory {
  status: string
  timestamp: string
  note?: string
}

interface ShipmentDetail {
  id: string
  orderId: string
  orderNumber?: string
  customerName?: string
  customerPhone?: string
  provider?: string
  vehicle?: string
  trackingUrl?: string
  status: string
  estimatedFee?: number
  createdAt: string
  statusHistory?: StatusHistory[]
}

const STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED']

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const router = useRouter()
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [bookingDelivery, setBookingDelivery] = useState(false)

  const load = useCallback(async () => {
    if (!token || !id) return
    setLoading(true)
    try {
      const data = await apiGet<ShipmentDetail>(`/delivery/shipments/${id}`, token)
      setShipment(data)
      setNewStatus(data.status)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load shipment')
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => {
    load()
  }, [load])

  async function handleStatusUpdate() {
    if (!token || !shipment || newStatus === shipment.status) return
    setUpdatingStatus(true)
    try {
      await apiPatch(`/delivery/shipments/${shipment.id}`, { status: newStatus }, token)
      setShipment((prev) => prev ? { ...prev, status: newStatus } : prev)
      toast.success('Status updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleBookDelivery() {
    if (!token || !shipment) return
    setBookingDelivery(true)
    try {
      await apiPost('/delivery/shipments', { orderId: shipment.orderId }, token)
      toast.success('Delivery booked')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to book delivery')
    } finally {
      setBookingDelivery(false)
    }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Shipment not found.</p>
        <button onClick={() => router.push('/delivery')} className="mt-4 text-sm text-brand-600 hover:underline">
          Back to Delivery
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/delivery')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Shipment #{shipment.orderNumber ?? shipment.id.slice(0, 8)}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Delivery details and tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Info</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Customer</dt>
              <dd className="text-sm font-medium text-gray-900">{shipment.customerName ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm font-medium text-gray-900">{shipment.customerPhone ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Provider</dt>
              <dd className="text-sm font-medium text-gray-900">{shipment.provider ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Vehicle</dt>
              <dd className="text-sm font-medium text-gray-900">{shipment.vehicle ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Est. Fee</dt>
              <dd className="text-sm font-medium text-gray-900">
                {shipment.estimatedFee != null ? `₦${shipment.estimatedFee.toLocaleString()}` : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm text-gray-600">{formatDate(shipment.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Status & Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</h2>
          <div className="mb-4">
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_BADGE[shipment.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {shipment.status.replace(/_/g, ' ')}
            </span>
          </div>

          {shipment.trackingUrl && (
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 mb-4"
            >
              <ExternalLink size={14} />
              Track shipment
            </a>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus || newStatus === shipment.status}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {updatingStatus && <Loader2 size={14} className="animate-spin" />}
              Update Status
            </button>

            {shipment.status === 'PENDING' && (
              <button
                onClick={handleBookDelivery}
                disabled={bookingDelivery}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-brand-600 text-brand-600 hover:bg-brand-50 text-sm font-semibold rounded-lg transition-colors"
              >
                {bookingDelivery ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Truck size={14} />
                )}
                Book Delivery
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status History */}
      {shipment.statusHistory && shipment.statusHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Status History</h2>
          <ol className="relative border-l border-gray-200 ml-3 space-y-4">
            {shipment.statusHistory.map((h, i) => (
              <li key={i} className="ml-4">
                <div className="absolute -left-1.5 w-3 h-3 bg-brand-600 rounded-full border-2 border-white" />
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[h.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {h.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(h.timestamp)}</span>
                </div>
                {h.note && <p className="text-xs text-gray-500 mt-1">{h.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
