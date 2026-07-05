import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  alert?: boolean
  subLabel?: string
}

export function StatCard({ label, value, icon, trend, alert, subLabel }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-5 flex flex-col gap-3 shadow-sm',
        alert && 'border-red-300 bg-red-50',
      )}
    >
      <div className="flex items-start justify-between">
        <p className={cn('text-sm font-medium', alert ? 'text-red-600' : 'text-gray-500')}>
          {label}
        </p>
        <div
          className={cn(
            'p-2 rounded-lg',
            alert ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600',
          )}
        >
          {icon}
        </div>
      </div>

      <div>
        <p className={cn('text-2xl font-bold', alert ? 'text-red-700' : 'text-gray-900')}>
          {value}
        </p>
        {subLabel && <p className="text-xs text-gray-400 mt-0.5">{subLabel}</p>}
      </div>

      {trend !== undefined && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend >= 0 ? 'text-green-600' : 'text-red-500',
          )}
        >
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(trend)}% vs yesterday</span>
        </div>
      )}
    </div>
  )
}
