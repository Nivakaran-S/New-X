'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Download, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { formatLKRShort, formatLKR } from '@/lib/utils'
import type { ApiResponse } from '@/types'

interface Invoice {
  id: string
  orderNumber: string
  createdAt: string
  total: number
  dueDate: string | null
  paymentStatus: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIAL'
}

interface UserBalance {
  outstandingBalance: number
  creditLimit: number
}

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  UNPAID: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-blue-100 text-blue-700',
}

export default function StatementPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [balance, setBalance] = useState<UserBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !token) {
      router.push('/login?next=/account/statement')
      return
    }
    if (user.accountType !== 'WHOLESALE') {
      router.push('/account')
      return
    }

    Promise.all([
      apiGet<ApiResponse<Invoice[]>>('/orders/my?paymentMethod=CREDIT_ACCOUNT', token),
      apiGet<ApiResponse<UserBalance>>('/users/me/balance', token),
    ])
      .then(([invoiceRes, balanceRes]) => {
        setInvoices(invoiceRes.data ?? [])
        setBalance(balanceRes.data ?? null)
      })
      .catch(() => {
        setInvoices([])
        setBalance(null)
      })
      .finally(() => setLoading(false))
  }, [user, token, router])

  function handleDownload() {
    window.print()
  }

  if (!user || user.accountType !== 'WHOLESALE') return null

  const outstanding = balance?.outstandingBalance ?? 0
  const creditLimit = balance?.creditLimit ?? 500000
  const availableCredit = creditLimit - outstanding
  const usedPercent = Math.min(100, (outstanding / creditLimit) * 100)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-16 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse">
          <div className="h-48 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Account Statement</h1>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Outstanding</p>
          </div>
          <p className="text-xl font-extrabold text-red-600">{formatLKRShort(outstanding)}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Credit Limit</p>
          </div>
          <p className="text-xl font-extrabold text-gray-900">{formatLKRShort(creditLimit)}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Available Credit</p>
          </div>
          <p className="text-xl font-extrabold text-green-600">{formatLKRShort(availableCredit)}</p>
        </div>
      </div>

      {/* Credit utilisation bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Credit used</span>
          <span>{Math.round(usedPercent)}% of {formatLKRShort(creditLimit)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${usedPercent > 80 ? 'bg-red-500' : usedPercent > 50 ? 'bg-amber-500' : 'bg-green-500'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">Invoice History</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No credit invoices yet</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 font-mono font-semibold text-gray-900">{inv.orderNumber}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {new Date(inv.createdAt).toLocaleDateString('en-LK', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{formatLKR(inv.total)}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {inv.dueDate
                          ? new Date(inv.dueDate).toLocaleDateString('en-LK', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${PAYMENT_STATUS_BADGE[inv.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {invoices.map((inv) => (
                <div key={inv.id} className="px-4 py-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-mono font-semibold text-gray-900 text-sm">{inv.orderNumber}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PAYMENT_STATUS_BADGE[inv.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{new Date(inv.createdAt).toLocaleDateString('en-LK')}</span>
                    <span className="font-semibold text-gray-900">{formatLKR(inv.total)}</span>
                  </div>
                  {inv.dueDate && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Due: {new Date(inv.dueDate).toLocaleDateString('en-LK')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header, nav, aside, .no-print { display: none !important; }
          body { font-size: 12px; }
        }
      `}</style>
    </div>
  )
}
