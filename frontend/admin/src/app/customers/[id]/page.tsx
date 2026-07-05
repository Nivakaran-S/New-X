'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowLeft, User, ShoppingBag, CreditCard, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SafeUser, OrderWithDetails } from '@healplace/types'

interface CustomerDetail extends SafeUser {
  totalSpend?: number
  orderCount?: number
  tier?: string
  creditLimit?: number
  outstandingBalance?: number
  wholesaleApproved?: boolean
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user: adminUser } = useAuthStore()
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)

  const load = useCallback(async () => {
    if (!token || !id) return
    try {
      const [customerData, ordersData] = await Promise.all([
        apiGet<CustomerDetail>(`/users/${id}`, token),
        apiGet<OrderWithDetails[]>(`/orders?customerId=${id}&limit=20`, token),
      ])
      setCustomer(customerData)
      setOrders(Array.isArray(ordersData) ? ordersData : [])
    } catch {
      toast.error('Failed to load customer')
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => {
    load()
  }, [load])

  async function handleApproveWholesale() {
    if (!token || !id) return
    setApproving(true)
    try {
      await apiPost(`/users/${id}/approve-wholesale`, {}, token)
      toast.success('Wholesale account approved')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setApproving(false)
    }
  }

  const canSeeFinancials =
    adminUser?.role === 'SUPER_ADMIN' || adminUser?.role === 'MANAGER'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Customer not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-brand-600 text-sm hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const isPendingWholesale =
    customer.role === 'WHOLESALE_BUYER' && !customer.wholesaleApproved

  const TIER_BADGE: Record<string, string> = {
    BRONZE: 'bg-orange-100 text-orange-700',
    SILVER: 'bg-gray-100 text-gray-700',
    GOLD: 'bg-yellow-100 text-yellow-700',
    PLATINUM: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name ?? customer.email}</h1>
          <p className="text-gray-500 text-sm">Customer profile</p>
        </div>
        {isPendingWholesale && (
          <button
            onClick={handleApproveWholesale}
            disabled={approving}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Approve Wholesale Account
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                <User size={20} className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{customer.name ?? '—'}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  {customer.role === 'WHOLESALE_BUYER' ? 'Wholesale' : 'Retail'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900 font-medium">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="text-gray-900">{customer.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {customer.tier && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tier</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BADGE[customer.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                    {customer.tier}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Account Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <ShoppingBag size={14} className="text-gray-400" />
                <span className="text-gray-600">Total Orders</span>
                <span className="ml-auto font-semibold">{customer.orderCount ?? orders.length}</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <CreditCard size={14} className="text-gray-400" />
                <span className="text-gray-600">Total Spend</span>
                <span className="ml-auto font-semibold">
                  {customer.totalSpend != null ? formatCurrency(customer.totalSpend) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Financials (SUPER_ADMIN / MANAGER only) */}
          {canSeeFinancials && (customer.creditLimit != null || customer.outstandingBalance != null) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">Credit</h3>
              <div className="space-y-2 text-sm">
                {customer.creditLimit != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Credit Limit</span>
                    <span className="font-semibold">{formatCurrency(customer.creditLimit)}</span>
                  </div>
                )}
                {customer.outstandingBalance != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Outstanding</span>
                    <span className={`font-semibold ${customer.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(customer.outstandingBalance)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order history */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Order History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Order #', 'Amount', 'Status', 'Payment', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                          #{order.orderNumber}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatCurrency(Number(order.totalAmount))}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} type="order" />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={order.payments?.[0]?.status ?? 'UNPAID'}
                            type="payment"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDateTime(order.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
