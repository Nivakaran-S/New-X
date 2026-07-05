'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageCircle,
  Package,
  CheckCircle2,
  Truck,
  Home,
  Clock,
  MapPin,
  Navigation,
  User,
  Phone,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'

interface ShipmentData {
  id: string
  status: 'PENDING' | 'BOOKING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'
  trackingUrl: string | null
  driverName: string | null
  driverPhone: string | null
  vehicleType: string | null
  estimatedDelivery: string | null
}

interface TrackingData {
  orderNumber: string
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
  customerName: string
  phone: string
  address: string
  estimatedDelivery: string | null
  vehicleType: string | null
  updatedAt: string
  items: { name: string; qty: number; unitType: string }[]
  shipment?: ShipmentData | null
}

interface TrackPageClientProps {
  initialData: TrackingData
}

// Order-level steps
const ORDER_STATUS_STEPS = [
  { key: 'PENDING', label: 'Order Received', icon: CheckCircle2, description: 'Your order has been placed' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2, description: 'Your order has been confirmed' },
  { key: 'PROCESSING', label: 'Processing', icon: Package, description: "We're packing your items" },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck, description: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered', icon: Home, description: 'Order delivered!' },
] as const

const ORDER_STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED']

// Shipment-level steps
const SHIPMENT_STEPS = [
  { key: 'PENDING', label: 'Preparing', icon: Clock, description: 'Shipment being arranged' },
  { key: 'BOOKING', label: 'Booking Driver', icon: Navigation, description: 'Finding a driver' },
  { key: 'ASSIGNED', label: 'Driver Assigned', icon: User, description: 'Driver has been assigned' },
  { key: 'PICKED_UP', label: 'Picked Up', icon: Package, description: 'Driver has the package' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck, description: 'On the way to you' },
  { key: 'DELIVERED', label: 'Delivered', icon: Home, description: 'Package delivered!' },
] as const

const SHIPMENT_STATUS_ORDER = ['PENDING', 'BOOKING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']

// Statuses that warrant auto-refresh
const ACTIVE_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED']
const ACTIVE_SHIPMENT_STATUSES = ['PENDING', 'BOOKING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']

export function TrackPageClient({ initialData }: TrackPageClientProps) {
  const [data, setData] = useState<TrackingData>(initialData)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const isActive =
    ACTIVE_ORDER_STATUSES.includes(data.status) ||
    (data.shipment ? ACTIVE_SHIPMENT_STATUSES.includes(data.shipment.status) : false)

  const refresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders/track/${data.orderNumber}`,
        { cache: 'no-store' },
      )
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setData(json.data)
          setLastRefreshed(new Date())
        }
      }
    } catch {
      // silently fail — use stale data
    } finally {
      setRefreshing(false)
    }
  }, [data.orderNumber, refreshing])

  // Auto-refresh every 30 seconds when order is active
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [isActive, refresh])

  const isCancelled = data.status === 'CANCELLED'
  const currentOrderIdx = ORDER_STATUS_ORDER.indexOf(data.status)
  const shipment = data.shipment
  const currentShipmentIdx = shipment ? SHIPMENT_STATUS_ORDER.indexOf(shipment.status) : -1
  const hasDriver = shipment?.driverName || shipment?.driverPhone

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Track Your Order</h1>
        <p className="font-mono font-bold text-brand-600 text-lg">{data.orderNumber}</p>
        {isActive && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-xs text-gray-500">Live — updates every 30s</p>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="ml-1 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Order status timeline */}
      {isCancelled ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center mb-6">
          <p className="text-lg font-bold text-red-700">Order Cancelled</p>
          <p className="text-sm text-red-600 mt-1">
            This order has been cancelled. Contact us via WhatsApp if you have questions.
          </p>
        </div>
      ) : (
        <div className="relative bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Order Progress</p>
          <div className="space-y-0">
            {ORDER_STATUS_STEPS.map((step, idx) => {
              const isDone = idx <= currentOrderIdx
              const isCurrent = idx === currentOrderIdx
              const Icon = step.icon
              const isLast = idx === ORDER_STATUS_STEPS.length - 1

              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone
                        ? isCurrent
                          ? 'bg-brand-600 ring-4 ring-brand-100'
                          : 'bg-brand-600'
                        : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${isDone ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${idx < currentOrderIdx ? 'bg-brand-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                    <p className={`text-sm font-semibold ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full uppercase">
                          Current
                        </span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDone ? 'text-gray-500' : 'text-gray-300'}`}>
                      {step.description}
                    </p>
                    {isCurrent && data.estimatedDelivery && step.key === 'DISPATCHED' && (
                      <p className="text-xs text-brand-600 font-semibold mt-1">
                        ETA: {data.estimatedDelivery}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Shipment tracking timeline */}
      {shipment && !isCancelled && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Shipment Tracking</p>
            {shipment.trackingUrl && (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
              >
                Track with PickMe
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="space-y-0">
            {SHIPMENT_STEPS.map((step, idx) => {
              const isDone = idx <= currentShipmentIdx
              const isCurrent = idx === currentShipmentIdx
              const Icon = step.icon
              const isLast = idx === SHIPMENT_STEPS.length - 1

              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone
                        ? isCurrent
                          ? 'bg-green-600 ring-4 ring-green-100'
                          : 'bg-green-600'
                        : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${isDone ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 min-h-[20px] ${idx < currentShipmentIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className={`pb-5 ${isLast ? 'pb-0' : ''}`}>
                    <p className={`text-sm font-semibold ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">
                          Now
                        </span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDone ? 'text-gray-500' : 'text-gray-300'}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Driver info (shown when ASSIGNED or later) */}
          {hasDriver && currentShipmentIdx >= SHIPMENT_STATUS_ORDER.indexOf('ASSIGNED') && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Driver</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  {shipment.driverName && (
                    <p className="text-sm font-semibold text-gray-900">{shipment.driverName}</p>
                  )}
                  {shipment.vehicleType && (
                    <p className="text-xs text-gray-500">{shipment.vehicleType}</p>
                  )}
                </div>
                {shipment.driverPhone && (
                  <a
                    href={`tel:${shipment.driverPhone}`}
                    className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 font-semibold px-3 py-2 rounded-xl hover:bg-green-100 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivery details */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 space-y-2 text-sm">
        <h2 className="font-semibold text-gray-900">Delivery Details</h2>
        <div className="flex justify-between">
          <span className="text-gray-500">Name</span>
          <span className="font-medium">{data.customerName}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 flex-shrink-0">Address</span>
          <span className="font-medium text-right">{data.address}</span>
        </div>
        {(data.vehicleType || shipment?.vehicleType) && (
          <div className="flex justify-between">
            <span className="text-gray-500">Vehicle</span>
            <span className="font-medium">{shipment?.vehicleType ?? data.vehicleType}</span>
          </div>
        )}
        {(data.estimatedDelivery || shipment?.estimatedDelivery) && (
          <div className="flex justify-between">
            <span className="text-gray-500">Estimated delivery</span>
            <span className="font-semibold text-brand-700">
              {shipment?.estimatedDelivery ?? data.estimatedDelivery}
            </span>
          </div>
        )}
        {lastRefreshed && isActive && (
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="text-gray-400 text-xs">Last updated</span>
            <span className="text-xs text-gray-400">
              {lastRefreshed.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Order items */}
      {data.items.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Items</h2>
          <div className="space-y-1">
            {data.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate flex-1">{item.name}</span>
                <span className="text-gray-500 flex-shrink-0 ml-2">{item.qty} × {item.unitType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp support */}
      <div className="text-center">
        <a
          href={`https://wa.me/94771234567?text=Hi%20HealPlace!%20I%27m%20tracking%20order%20${data.orderNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#20b858] transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Contact Support via WhatsApp
        </a>
      </div>
    </div>
  )
}
