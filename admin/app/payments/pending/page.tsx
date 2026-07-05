'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'
import { CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface PendingRow {
  order: OrderWithDetails
  verifying: boolean
  rejecting: boolean
  rejectReason: string
  showReject: boolean
}

export default function PendingPaymentsPage() {
  const { token } = useAuthStore()
  const [rows, setRows] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<OrderWithDetails[]>('/orders?status=PENDING_VERIFICATION&limit=100', token)
      const list = Array.isArray(data) ? data : []
      setRows(
        list.map((order) => ({
          order,
          verifying: false,
          rejecting: false,
          rejectReason: '',
          showReject: false,
        })),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load pending payments')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  function updateRow(orderId: string, patch: Partial<PendingRow>) {
    setRows((prev) => prev.map((r) => (r.order.id === orderId ? { ...r, ...patch } : r)))
  }

  async function handleVerify(orderId: string) {
    if (!token) return
    updateRow(orderId, { verifying: true })
    try {
      await apiPost(`/payments/${orderId}/verify`, {}, token)
      toast.success('Payment verified')
      setRows((prev) => prev.filter((r) => r.order.id !== orderId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed')
      updateRow(orderId, { verifying: false })
    }
  }

  async function handleReject(orderId: string, reason: string) {
    if (!token) return
    if (!reason.trim()) {
      toast.error('Please enter a reject reason')
      return
    }
    updateRow(orderId, { rejecting: true })
    try {
      await apiPost(`/payments/${orderId}/reject`, { reason }, token)
      toast.success('Payment rejected')
      setRows((prev) => prev.filter((r) => r.order.id !== orderId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed')
      updateRow(orderId, { rejecting: false })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Payment Verification</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {rows.length} payment{rows.length !== 1 ? 's' : ''} awaiting review
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-300" size={32} />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <CreditCard className="mx-auto text-gray-200 mb-3" size={40} />
          <p className="text-gray-400 font-medium">No pending payments</p>
          <p className="text-gray-300 text-sm mt-1">All payment slips have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const payment = row.order.payments?.[0]
            const slipUrl = (payment as { slipUrl?: string; bankSlipUrl?: string })?.slipUrl ??
              (payment as { slipUrl?: string; bankSlipUrl?: string })?.bankSlipUrl

            return (
              <div
                key={row.order.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  {/* Slip preview */}
                  {slipUrl ? (
                    <div className="flex-shrink-0">
                      <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
                        Payment Slip
                      </p>
                      <Image
                        src={slipUrl}
                        alt="Payment slip"
                        width={160}
                        height={200}
                        className="w-40 h-48 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  ) : (
                    <div className="w-40 h-48 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
                      <p className="text-xs text-gray-300">No slip uploaded</p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Order #{row.order.orderNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          {row.order.customer?.name ?? row.order.customer?.email ?? 'Guest'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(Number(row.order.totalAmount))}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatRelativeTime(row.order.createdAt)}
                        </p>
                      </div>
                    </div>

                    {payment?.referenceNo && (
                      <p className="text-xs font-mono text-gray-400">
                        Ref: {payment.referenceNo}
                      </p>
                    )}

                    {/* Items summary */}
                    <div className="text-sm text-gray-500">
                      {row.order.items.slice(0, 2).map((item, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {item.variant?.product?.name} ×{item.quantity}
                        </span>
                      ))}
                      {row.order.items.length > 2 && (
                        <span className="text-gray-400"> +{row.order.items.length - 2} more</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleVerify(row.order.id)}
                        disabled={row.verifying}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {row.verifying ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Verify
                      </button>

                      <button
                        onClick={() =>
                          updateRow(row.order.id, { showReject: !row.showReject })
                        }
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>

                    {row.showReject && (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Reason for rejection..."
                          value={row.rejectReason}
                          onChange={(e) =>
                            updateRow(row.order.id, { rejectReason: e.target.value })
                          }
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        <button
                          onClick={() => handleReject(row.order.id, row.rejectReason)}
                          disabled={row.rejecting}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          {row.rejecting && <Loader2 size={14} className="animate-spin" />}
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
