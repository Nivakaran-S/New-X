'use client'

import { Minus, Plus, X } from 'lucide-react'
import type { TxItem } from '@/lib/store'
import type { UnitType } from '@/types'

interface Props {
  item: TxItem
  onUpdateQty: (variantId: string, unitType: UnitType, qty: number) => void
  onRemove: (variantId: string, unitType: UnitType) => void
}

const UNIT_BADGES: Record<UnitType, string> = {
  UNIT: 'bg-slate-600 text-slate-300',
  DOZEN: 'bg-blue-500/20 text-blue-300',
  CASE: 'bg-amber-500/20 text-amber-300',
  PALLET: 'bg-purple-500/20 text-purple-300',
}

const UNIT_LABELS: Record<UnitType, string> = {
  UNIT: 'Unit',
  DOZEN: 'Dozen',
  CASE: 'Case',
  PALLET: 'Pallet',
}

function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function TransactionItem({ item, onUpdateQty, onRemove }: Props) {
  const lineTotal = item.qty * item.unitPrice - item.discount

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group">
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate leading-tight">
          {item.variant.product.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${UNIT_BADGES[item.unitType]}`}
          >
            {UNIT_LABELS[item.unitType]}
          </span>
          <span className="text-xs text-slate-500">
            {formatLKR(item.unitPrice)} each
          </span>
        </div>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() =>
            onUpdateQty(item.variantId, item.unitType, item.qty - 1)
          }
          disabled={item.qty <= 1}
          aria-label="Decrease quantity"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center text-sm font-semibold text-white tabular-nums">
          {item.qty}
        </span>
        <button
          onClick={() =>
            onUpdateQty(item.variantId, item.unitType, item.qty + 1)
          }
          aria-label="Increase quantity"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Line total */}
      <div className="w-24 text-right">
        <span className="text-sm font-semibold text-white tabular-nums">
          {formatLKR(lineTotal)}
        </span>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.variantId, item.unitType)}
        aria-label="Remove item"
        className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
