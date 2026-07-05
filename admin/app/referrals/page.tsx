'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Users, Gift, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface Referral {
  id: string
  referrer?: { id: string; name?: string; email?: string }
  referrerName?: string
  referrerId?: string
  referred?: { id: string; name?: string; email?: string }
  referredName?: string
  referredId?: string
  createdAt: string
  bonusAwarded: boolean
  orderId?: string
}

type FilterTab = 'ALL' | 'AWARDED' | 'PENDING'

function formatDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getReferrerName(r: Referral): string {
  return r.referrer?.name || r.referrerName || r.referrer?.email || r.referrerId || '—'
}

function getReferredName(r: Referral): string {
  return r.referred?.name || r.referredName || r.referred?.email || r.referredId || '—'
}

export default function ReferralsPage() {
  const { token } = useAuthStore()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<Referral[]>('/referral/admin', token)
      setReferrals(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load referrals')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const totalCount = referrals.length
  const awardedCount = referrals.filter((r) => r.bonusAwarded).length
  const pendingCount = referrals.filter((r) => !r.bonusAwarded).length

  const filtered = referrals.filter((r) => {
    if (activeTab === 'AWARDED') return r.bonusAwarded
    if (activeTab === 'PENDING') return !r.bonusAwarded
    return true
  })

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: totalCount },
    { key: 'AWARDED', label: 'Awarded', count: awardedCount },
    { key: 'PENDING', label: 'Pending', count: pendingCount },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'referrerName',
      header: 'Referrer',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{getReferrerName(row as unknown as Referral)}</span>
      ),
    },
    {
      key: 'referredName',
      header: 'Referred User',
      sortable: true,
      render: (row) => (
        <span className="text-gray-700">{getReferredName(row as unknown as Referral)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500">{formatDate((row as unknown as Referral).createdAt)}</span>
      ),
    },
    {
      key: 'bonusAwarded',
      header: 'Bonus',
      render: (row) => {
        const r = row as unknown as Referral
        return r.bonusAwarded ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Awarded</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">Pending</span>
        )
      },
    },
    {
      key: 'orderId',
      header: 'Order ID',
      render: (row) => {
        const r = row as unknown as Referral
        return r.orderId ? (
          <span className="font-mono text-xs text-gray-600">{r.orderId.slice(0, 8)}…</span>
        ) : (
          <span className="text-gray-300">—</span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <p className="text-gray-500 text-sm mt-0.5">Track and manage customer referrals</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Users size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Referrals</p>
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50">
            <Gift size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Bonus Awarded</p>
            <p className="text-2xl font-bold text-gray-900">{awardedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-50">
            <Clock size={18} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No referrals found."
      />
    </div>
  )
}
