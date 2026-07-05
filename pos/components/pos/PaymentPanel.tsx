'use client'

import { useState } from 'react'
import { Banknote, Building2, CreditCard, CheckCircle2 } from 'lucide-react'
import type { PaymentMethod, SafeUser } from '@/types'

interface Props {
  paymentMethod: PaymentMethod
  cashReceived: number
  referenceNo: string
  total: number
  change: number
  customer: SafeUser | null
  hasItems: boolean
  isSubmitting: boolean
  onSetMethod: (m: PaymentMethod) => void
  onSetCashReceived: (amount: number) => void
  onSetReferenceNo: (ref: string) => void
  onConfirm: () => void
}

function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] =
  [
    { value: 'CASH', label: 'Cash', icon: Banknote },
    { value: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
    { value: 'CREDIT_ACCOUNT', label: 'Credit', icon: CreditCard },
  ]

export function PaymentPanel({
  paymentMethod,
  cashReceived,
  referenceNo,
  total,
  change,
  customer,
  hasItems,
  isSubmitting,
  onSetMethod,
  onSetCashReceived,
  onSetReferenceNo,
  onConfirm,
}: Props) {
  const creditLimit = Number(customer?.creditLimit ?? 0)
  const outstanding = Number(customer?.outstandingBalance ?? 0)
  const availableCredit = creditLimit - outstanding

  const creditOk =
    paymentMethod !== 'CREDIT_ACCOUNT' ||
    (customer !== null && availableCredit >= total)

  const canConfirm =
    hasItems &&
    creditOk &&
    (paymentMethod !== 'CASH' || cashReceived >= total) &&
    (paymentMethod !== 'BANK_TRANSFER' || referenceNo.trim().length > 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Method tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl">
        {METHODS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onSetMethod(value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
              paymentMethod === value
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Cash panel */}
      {paymentMethod === 'CASH' && (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">
              Amount received (LKR)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={cashReceived || ''}
              onChange={(e) => onSetCashReceived(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>
          {cashReceived > 0 && (
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                change >= 0
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              <span className="text-xs font-medium text-slate-300">Change</span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatLKR(change)}
              </span>
            </div>
          )}
          {/* Quick cash buttons */}
          <div className="grid grid-cols-4 gap-1">
            {[500, 1000, 2000, 5000].map((amount) => (
              <button
                key={amount}
                onClick={() => onSetCashReceived(amount)}
                className="py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 font-medium transition-colors"
              >
                {amount}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bank transfer panel */}
      {paymentMethod === 'BANK_TRANSFER' && (
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1 block">
            Reference / slip number
          </label>
          <input
            type="text"
            value={referenceNo}
            onChange={(e) => onSetReferenceNo(e.target.value)}
            placeholder="e.g. TXN20240705123"
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
          />
        </div>
      )}

      {/* Credit account panel */}
      {paymentMethod === 'CREDIT_ACCOUNT' && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 space-y-2">
          {customer ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Credit limit</span>
                <span className="text-white font-medium tabular-nums">
                  {formatLKR(creditLimit)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Outstanding</span>
                <span className="text-amber-400 font-medium tabular-nums">
                  {formatLKR(outstanding)}
                </span>
              </div>
              <div className="h-px bg-slate-700" />
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Available</span>
                <span
                  className={`font-bold tabular-nums ${availableCredit >= total ? 'text-green-400' : 'text-red-400'}`}
                >
                  {formatLKR(availableCredit)}
                </span>
              </div>
              {availableCredit < total && (
                <p className="text-xs text-red-400 text-center pt-1">
                  Insufficient credit limit
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-1">
              Select a customer to use credit account
            </p>
          )}
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={!canConfirm || isSubmitting}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg"
      >
        {isSubmitting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4" />
        )}
        {isSubmitting ? 'Processing…' : 'Confirm Sale'}
      </button>
    </div>
  )
}
