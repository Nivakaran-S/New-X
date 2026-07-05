'use client'

import { useRef } from 'react'
import { Printer, ShoppingBag, X } from 'lucide-react'
import type { OrderWithDetails } from '@/types'

interface Props {
  order: OrderWithDetails
  change: number
  onClose: () => void
  onNewSale: () => void
}

function formatLKR(amount: number | string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT_ACCOUNT: 'Credit Account',
  COD: 'Cash on Delivery',
  SPLIT: 'Split Payment',
}

export function ReceiptModal({ order, change, onClose, onNewSale }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  const total = Number(order.totalAmount ?? 0)
  const discount = Number(order.discountAmount ?? 0)
  const subtotal = Number(order.subtotal ?? total + discount)
  const paymentMethod = order.payments[0]?.method ?? 'CASH'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold text-white">Sale Complete</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Receipt content (printable) */}
          <div
            ref={printRef}
            className="px-6 py-4 space-y-4 print:text-black print:bg-white"
          >
            {/* Store header (print only) */}
            <div className="hidden print:block text-center mb-4">
              <p className="font-bold text-lg">HealPlace Wholesale</p>
              <p className="text-sm">Pettah, Colombo 11</p>
              <p className="text-sm">Tel: +94 77 000 0000</p>
            </div>

            {/* Order info */}
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Order</span>
                <span className="font-mono font-semibold text-white">
                  #{order.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span className="text-slate-300">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
              {order.customer && (
                <div className="flex justify-between">
                  <span>Customer</span>
                  <span className="text-slate-300">{order.customer.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment</span>
                <span className="text-slate-300">
                  {PAYMENT_LABELS[paymentMethod] ?? paymentMethod}
                </span>
              </div>
            </div>

            <div className="h-px bg-slate-700 print:bg-slate-300" />

            {/* Items */}
            <div className="space-y-2">
              {order.items.map((item) => {
                const unitPrice = Number(item.unitPrice ?? 0)
                const lineTotal = Number(item.totalPrice ?? unitPrice * item.qty)
                return (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {item.variant.product.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.unitType} × {item.qty} @ {formatLKR(unitPrice)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-white tabular-nums whitespace-nowrap">
                      {formatLKR(lineTotal)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="h-px bg-slate-700 print:bg-slate-300" />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatLKR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span>
                  <span className="tabular-nums">- {formatLKR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white text-base pt-1">
                <span>TOTAL</span>
                <span className="tabular-nums">{formatLKR(total)}</span>
              </div>
              {paymentMethod === 'CASH' && change > 0 && (
                <div className="flex justify-between text-brand-400 font-semibold">
                  <span>Change</span>
                  <span className="tabular-nums">{formatLKR(change)}</span>
                </div>
              )}
            </div>

            {/* Print footer */}
            <div className="hidden print:block text-center text-xs text-slate-500 mt-4 pt-4 border-t border-slate-300">
              <p>Thank you for your business!</p>
              <p>www.healplace.com</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onNewSale}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              New Sale
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(.print-target) { display: none !important; }
          .print-target { display: block !important; }
        }
      `}</style>
    </>
  )
}
