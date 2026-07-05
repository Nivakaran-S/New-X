'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { OrderWithDetails } from '@healplace/types'
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'

const ORDER_STATUSES = [
  'PENDING',
  'PENDING_VERIFICATION',
  'CONFIRMED',
  'PROCESSING',
  'PRE_ORDER',
  'CANCELLED',
  'REFUNDED',
]

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const router = useRouter()
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const loadOrder = useCallback(async () => {
    if (!token || !id) return
    try {
      const data = await apiGet<OrderWithDetails>(`/orders/${id}`, token)
      setOrder(data)
      setNewStatus(data.status)
    } catch {
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  async function handleVerifyPayment() {
    if (!token || !order) return
    setVerifying(true)
    try {
      await apiPost(`/payments/${order.id}/verify`, {}, token)
      toast.success('Payment verified successfully')
      loadOrder()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  async function handleRejectPayment() {
    if (!token || !order || !rejectReason.trim()) {
      toast.error('Please enter a reject reason')
      return
    }
    setRejecting(true)
    try {
      await apiPost(`/payments/${order.id}/reject`, { reason: rejectReason }, token)
      toast.success('Payment rejected')
      setRejectReason('')
      loadOrder()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject payment')
    } finally {
      setRejecting(false)
    }
  }

  async function handleUpdateStatus() {
    if (!token || !order || newStatus === order.status) return
    setUpdatingStatus(true)
    try {
      await apiPatch(`/orders/${order.id}/status`, { status: newStatus }, token)
      toast.success('Order status updated')
      loadOrder()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Order not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-brand-600 text-sm hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const payment = order.payments?.[0]
  const hasSlip = payment?.slipUrl || payment?.bankSlipUrl
  const isPendingVerification = payment?.status === 'PENDING' && hasSlip

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
          <p className="text-gray-500 text-sm">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={order.status} type="order" />
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {order.source}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: items + payment */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={16} />
              Order Items
            </h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  {item.variant?.product?.images?.[0]?.url && (
                    <Image
                      src={item.variant.product.images[0].url}
                      alt={item.variant.product.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {item.variant?.product?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.variant?.name} · {item.unitType} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(Number(item.lineTotal))}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(Number(item.unitPrice))} each</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(order.subtotal))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(Number(order.discountAmount))}</span>
                </div>
              )}
              {Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery</span>
                  <span>{formatCurrency(Number(order.deliveryFee))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(Number(order.totalAmount))}</span>
              </div>
            </div>
          </div>

          {/* Payment verification */}
          {payment && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard size={16} />
                Payment
              </h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Method: <span className="font-medium">{payment.method}</span></p>
                  <p className="text-sm text-gray-600 mt-1">
                    Status: <StatusBadge status={payment.status} type="payment" />
                  </p>
                </div>
                {payment.referenceNo && (
                  <p className="text-xs text-gray-400 font-mono">Ref: {payment.referenceNo}</p>
                )}
              </div>

              {hasSlip && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Payment Slip</p>
                  <Image
                    src={(payment.slipUrl ?? payment.bankSlipUrl)!}
                    alt="Payment slip"
                    width={300}
                    height={400}
                    className="max-h-64 w-auto object-contain rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {isPendingVerification && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={handleVerifyPayment}
                      disabled={verifying}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Verify Payment
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Reject reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <button
                      onClick={handleRejectPayment}
                      disabled={rejecting}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {rejecting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: customer, delivery, actions */}
        <div className="space-y-5">
          {/* Customer */}
          {order.customer && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User size={16} />
                Customer
              </h2>
              <p className="font-medium text-gray-900">{order.customer.name}</p>
              <p className="text-sm text-gray-500">{order.customer.email}</p>
              {order.customer.phone && (
                <p className="text-sm text-gray-500">{order.customer.phone}</p>
              )}
            </div>
          )}

          {/* Delivery address */}
          {order.deliveryAddress && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin size={16} />
                Delivery Address
              </h2>
              <address className="not-italic text-sm text-gray-600 space-y-0.5">
                <p>{(order.deliveryAddress as { line1?: string }).line1}</p>
                {(order.deliveryAddress as { line2?: string }).line2 && (
                  <p>{(order.deliveryAddress as { line2?: string }).line2}</p>
                )}
                <p>
                  {(order.deliveryAddress as { city?: string }).city}
                  {(order.deliveryAddress as { postalCode?: string }).postalCode && `, ${(order.deliveryAddress as { postalCode?: string }).postalCode}`}
                </p>
              </address>
            </div>
          )}

          {/* Shipment */}
          {order.shipment && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3">Shipment</h2>
              <StatusBadge status={order.shipment.status} type="shipment" />
              {order.shipment.trackingNo && (
                <p className="text-xs font-mono text-gray-400 mt-2">
                  Tracking: {order.shipment.trackingNo}
                </p>
              )}
              {order.shipment.provider && (
                <p className="text-sm text-gray-600 mt-1">{order.shipment.provider}</p>
              )}
            </div>
          )}

          {/* Update status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Update Status</h2>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button
              onClick={handleUpdateStatus}
              disabled={updatingStatus || newStatus === order.status}
              className="w-full py-2 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {updatingStatus && <Loader2 size={14} className="animate-spin" />}
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
