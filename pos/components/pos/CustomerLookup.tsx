'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X, User, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiGet } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import type { SafeUser, ApiResponse } from '@/types'

interface Props {
  selected: SafeUser | null
  onSelect: (customer: SafeUser | null) => void
}

function formatLKR(amount: number | string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CustomerLookup({ selected, onSelect }: Props) {
  const token = useAuthStore((s) => s.token)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const data = await apiGet<SafeUser[]>(
          `/users?search=${encodeURIComponent(q)}&role=WHOLESALE_BUYER`,
          token ?? undefined,
        )
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(customer: SafeUser) {
    onSelect(customer)
    setQuery('')
    setResults([])
    setOpen(false)
    toast.success(`Customer: ${customer.name}`)
  }

  function handleClear() {
    onSelect(null)
    setQuery('')
    setResults([])
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (selected) {
    const creditLimit = Number(selected.creditLimit ?? 0)
    const outstanding = Number(selected.outstandingBalance ?? 0)
    const available = creditLimit - outstanding

    return (
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-brand-900/30 border border-brand-700/40">
        <div className="flex-none w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center">
          <User className="w-4 h-4 text-brand-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {selected.name}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {selected.phone ?? selected.email}
          </p>
          {creditLimit > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <CreditCard className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-400">
                Credit: {formatLKR(available)} available
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleClear}
          aria-label="Remove customer"
          className="flex-none w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-red-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="tel"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          placeholder="Search customer by phone…"
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border border-brand-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {results.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 transition-colors text-left"
            >
              <div className="flex-none w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {customer.name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {customer.phone ?? customer.email}
                  {customer.businessName ? ` · ${customer.businessName}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query && !loading && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3">
          <p className="text-xs text-slate-500 text-center">
            No customers found
          </p>
        </div>
      )}
    </div>
  )
}
