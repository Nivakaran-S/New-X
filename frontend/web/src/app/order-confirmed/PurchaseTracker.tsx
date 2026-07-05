'use client'

import { useEffect } from 'react'
import { trackPurchase } from '@/lib/analytics'

interface PurchaseTrackerProps {
  orderId: string
}

/**
 * Fires the Meta Pixel + GA4 Purchase event once on mount.
 * Total value and item details are not available at this stage
 * (the cart has already been cleared), so we record the order
 * reference only. For full value tracking, pass totals via
 * searchParams from the checkout page.
 */
export default function PurchaseTracker({ orderId }: PurchaseTrackerProps) {
  useEffect(() => {
    if (!orderId) return
    trackPurchase(orderId, 0, [])
  }, [orderId])

  return null
}
