import { cn } from '@/lib/utils'

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PENDING_VERIFICATION: 'bg-orange-100 text-orange-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  PRE_ORDER: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-700',
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  UNPAID: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-800',
  VERIFIED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-700',
}

const SHIPMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  BOOKING: 'bg-blue-50 text-blue-700',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  PICKED_UP: 'bg-indigo-100 text-indigo-800',
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

interface StatusBadgeProps {
  status: string
  type?: 'order' | 'payment' | 'shipment'
  className?: string
}

export function StatusBadge({ status, type = 'order', className }: StatusBadgeProps) {
  const styleMap =
    type === 'payment'
      ? PAYMENT_STATUS_STYLES
      : type === 'shipment'
        ? SHIPMENT_STATUS_STYLES
        : ORDER_STATUS_STYLES

  const styles = styleMap[status] ?? 'bg-gray-100 text-gray-700'
  const label = status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles,
        className,
      )}
    >
      {label}
    </span>
  )
}
