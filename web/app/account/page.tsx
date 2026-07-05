'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Package,
  MapPin,
  Star,
  Crown,
  CreditCard,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { formatLKRShort } from '@/lib/utils'
import type { ApiResponse } from '@/types'

interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  total: number
  itemCount: number
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
  DISPATCHED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function AccountPage() {
  const router = useRouter()
  const { user, token, logout } = useAuthStore()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !token) {
      router.push('/login?next=/account')
      return
    }
    apiGet<ApiResponse<OrderSummary[]>>('/orders/my', token)
      .then((res) => setOrders(res.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user, token, router])

  if (!user) return null

  const isWholesale = user.accountType === 'WHOLESALE'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {user.name?.split(' ')[0] ?? 'there'}! 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
        <button
          onClick={() => { logout(); router.push('/') }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors touch-target"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Wholesale badge */}
      {isWholesale && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-brand-800">Wholesale Account</p>
            <p className="text-xs text-brand-600">You have access to wholesale pricing</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Credit Limit</p>
            <p className="font-bold text-gray-900">{formatLKRShort(500000)}</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-1">
            <Package className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{orders.length}</p>
          <p className="text-xs text-gray-500">Total Orders</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-1">
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{user.loyaltyPoints ?? 0}</p>
          <p className="text-xs text-gray-500">Loyalty Points</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
            <CreditCard className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatLKRShort(orders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + o.total, 0))}
          </p>
          <p className="text-xs text-gray-500">Total Spent</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: MapPin, label: 'Saved Addresses', href: '/account/addresses' },
          { icon: Star, label: 'Loyalty Points', href: '/account/loyalty' },
        ].map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:shadow-md transition-shadow"
          >
            <Icon className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </Link>
        ))}
      </div>

      {/* Order history */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">Order History</h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-48" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No orders yet</p>
            <Link
              href="/products"
              className="text-brand-600 hover:underline font-medium text-sm"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/track/${order.orderNumber}`}
                className="block bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-LK')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{formatLKRShort(order.total)}</p>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto mt-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
