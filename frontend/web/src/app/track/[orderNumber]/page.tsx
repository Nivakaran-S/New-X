import { notFound } from 'next/navigation'
import Link from 'next/link'
import { apiGet } from '@/lib/api'
import type { ApiResponse } from '@healplace/types'
import { TrackPageClient } from './TrackPageClient'

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

interface TrackPageProps {
  params: Promise<{ orderNumber: string }>
}

async function getTracking(orderNumber: string): Promise<TrackingData | null> {
  try {
    const res = await apiGet<ApiResponse<TrackingData>>(`/orders/track/${orderNumber}`)
    return res.data ?? null
  } catch {
    return null
  }
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { orderNumber } = await params
  const tracking = await getTracking(orderNumber)

  if (!tracking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Order not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          Check the order number and try again.
        </p>
        <Link href="/" className="text-brand-600 hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  return <TrackPageClient initialData={tracking} />
}
