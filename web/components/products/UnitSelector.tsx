'use client'

import { cn } from '@/lib/utils'
import { formatLKRShort } from '@/lib/utils'

export type UnitOption = {
  unitType: 'UNIT' | 'DOZEN' | 'CASE'
  label: string
  price: number
  unitsPerPack: number
  isBestValue?: boolean
}

interface UnitSelectorProps {
  options: UnitOption[]
  selected: UnitOption['unitType']
  onChange: (unitType: UnitOption['unitType'], price: number, unitsPerPack: number) => void
  className?: string
}

export function UnitSelector({
  options,
  selected,
  onChange,
  className,
}: UnitSelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => (
        <button
          key={opt.unitType}
          onClick={() => onChange(opt.unitType, opt.price, opt.unitsPerPack)}
          className={cn(
            'relative flex flex-col items-start px-3 py-2 rounded-lg border-2 text-left transition-all min-w-[90px] touch-target',
            selected === opt.unitType
              ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
              : 'border-gray-200 bg-white hover:border-brand-300',
          )}
        >
          {opt.isBestValue && (
            <span className="absolute -top-2 left-2 bg-brand-600 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full">
              Best value
            </span>
          )}
          <span className="text-xs text-gray-500 mb-0.5">{opt.label}</span>
          <span
            className={cn(
              'text-sm font-bold',
              selected === opt.unitType ? 'text-brand-700' : 'text-gray-900',
            )}
          >
            {formatLKRShort(opt.price)}
          </span>
        </button>
      ))}
    </div>
  )
}
