'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, RefreshCw, ExternalLink, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore, useCartStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { formatLKRShort } from '@/lib/utils'
import type { ApiResponse } from '@healplace/types'

interface OrderItem {
  variantId: string
  productId: string
  productName: string
  brandName: string
  slug: string
  imageUrl: string | null
  unitType: string
  qty: number
  unitPrice: number
  unitLabel: string
  unitsPerPack: number
}

interface Order {
  id: string
  orderNumber: string
  status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
  total: number
  itemCount: number
  createdAt: string
  items?: OrderItem[]
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  DISPATCHED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !token) {
      router.push('/login?next=/account/orders')
      return
    }
    apiGet<ApiResponse<Order[]>>('/orders/my', token)
      .then((res) => setOrders(res.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user, token, router])

  async function handleReorder(order: Order) {
    if (reordering) return
    setReordering(order.id)

    try {
      // If items aren't loaded, fetch the full order
      let items = order.items
      if (!items || items.length === 0) {
        const res = await apiGet<ApiResponse<Order>>(`/orders/${order.id}`, token ?? undefined)
        items = res.data?.items ?? []
      }

      if (!items || items.length === 0) {
        toast.error('Could not load order items')
        return
      }

      items.forEach((item) => {
        addItem({
          variantId: item.variantId,
          productId: item.productId,
          productName: item.productName,
          brandName: item.brandName,
          slug: item.slug,
          imageUrl: item.imageUrl,
          unitType: item.unitType as any,
          qty: item.qty,
          unitPrice: item.unitPrice,
          unitLabel: item.unitLabel,
          unitsPerPack: item.unitsPerPack,
        })
      })

      toast.success(`${items.length} item${items.length !== 1 ? 's' : ''} added to cart!`, { icon: '🛒' })
      router.push('/cart')
    } catch {
      toast.error('Failed to reorder. Please try again.')
    } finally {
      setReordering(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-48 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500 text-sm mb-6">Your order history will appear here.</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
        <span className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-mono font-semibold text-gray-900">{order.orderNumber}</span>
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString('en-LK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900">
                  {formatLKRShort(order.total)}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/track/${order.orderNumber}`}
                      className="flex items-center gap-1 text-xs text-green-600 hover:underline font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Track
                    </Link>
                    {order.status === 'DELIVERED' && (
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reordering === order.id}
                        className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
                      >
                        <RefreshCw className={`w-3 h-3 ${reordering === order.id ? 'animate-spin' : ''}`} />
                        Reorder
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-mono font-semibold text-gray-900 text-sm">{order.orderNumber}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString('en-LK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {order.status}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-50 pt-3">
              <div>
                <p className="text-xs text-gray-500">{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</p>
                <p className="font-bold text-gray-900">{formatLKRShort(order.total)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/track/${order.orderNumber}`}
                  className="flex items-center gap-1 text-xs text-green-600 hover:underline font-medium px-2.5 py-1.5 border border-green-200 rounded-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Track
                </Link>
                {order.status === 'DELIVERED' && (
                  <button
                    onClick={() => handleReorder(order)}
                    disabled={reordering === order.id}
                    className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
                  >
                    <RefreshCw className={`w-3 h-3 ${reordering === order.id ? 'animate-spin' : ''}`} />
                    Reorder
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
