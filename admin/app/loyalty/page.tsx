'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Gift, TrendingUp, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface LeaderboardEntry {
  userId: string
  userName: string
  userEmail: string
  totalPointsEarned: number
  totalPointsRedeemed: number
  currentBalance: number
  tier?: string
}

interface LoyaltySummary {
  totalIssued: number
  totalRedeemed: number
  totalOutstanding: number
}

const TIER_BADGE: Record<string, string> = {
  BRONZE: 'bg-orange-100 text-orange-700',
  SILVER: 'bg-gray-100 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-700',
  PLATINUM: 'bg-purple-100 text-purple-700',
}

export default function LoyaltyPage() {
  const { token } = useAuthStore()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [summary, setSummary] = useState<LoyaltySummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<{ leaderboard: LeaderboardEntry[]; summary: LoyaltySummary }>(
        '/loyalty/admin/leaderboard',
        token,
      )
      setLeaderboard(Array.isArray((data as { leaderboard?: LeaderboardEntry[] }).leaderboard) ? (data as { leaderboard: LeaderboardEntry[] }).leaderboard : Array.isArray(data) ? (data as unknown as LeaderboardEntry[]) : [])
      if ((data as { summary?: LoyaltySummary }).summary) setSummary((data as { summary: LoyaltySummary }).summary)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load loyalty data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const computedSummary = summary ?? {
    totalIssued: leaderboard.reduce((s, e) => s + e.totalPointsEarned, 0),
    totalRedeemed: leaderboard.reduce((s, e) => s + e.totalPointsRedeemed, 0),
    totalOutstanding: leaderboard.reduce((s, e) => s + e.currentBalance, 0),
  }

  const statCards = [
    { label: 'Total Points Issued', value: computedSummary.totalIssued.toLocaleString(), icon: <Gift size={20} className="text-blue-500" />, bg: 'bg-blue-50' },
    { label: 'Total Redeemed', value: computedSummary.totalRedeemed.toLocaleString(), icon: <TrendingUp size={20} className="text-green-500" />, bg: 'bg-green-50' },
    { label: 'Outstanding Balance', value: computedSummary.totalOutstanding.toLocaleString(), icon: <Star size={20} className="text-yellow-500" />, bg: 'bg-yellow-50' },
  ]

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'rank',
      header: '#',
      render: (_row, index) => (
        <span className="font-bold text-gray-400 text-sm">{(index ?? 0) + 1}</span>
      ),
    },
    {
      key: 'userName',
      header: 'Customer',
      sortable: true,
      render: (row) => {
        const e = row as unknown as LeaderboardEntry
        return (
          <div>
            <p className="font-medium text-gray-900">{e.userName ?? '—'}</p>
            <p className="text-xs text-gray-400">{e.userEmail}</p>
          </div>
        )
      },
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (row) => {
        const e = row as unknown as LeaderboardEntry
        if (!e.tier) return <span className="text-gray-300">—</span>
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BADGE[e.tier] ?? 'bg-gray-100 text-gray-600'}`}>
            {e.tier}
          </span>
        )
      },
    },
    {
      key: 'totalPointsEarned',
      header: 'Points Earned',
      sortable: true,
      render: (row) => {
        const e = row as unknown as LeaderboardEntry
        return <span className="font-semibold text-gray-900">{e.totalPointsEarned.toLocaleString()}</span>
      },
    },
    {
      key: 'totalPointsRedeemed',
      header: 'Redeemed',
      sortable: true,
      render: (row) => {
        const e = row as unknown as LeaderboardEntry
        return <span className="text-gray-600">{e.totalPointsRedeemed.toLocaleString()}</span>
      },
    },
    {
      key: 'currentBalance',
      header: 'Balance',
      sortable: true,
      render: (row) => {
        const e = row as unknown as LeaderboardEntry
        return (
          <span className={`font-semibold ${e.currentBalance > 0 ? 'text-green-700' : 'text-gray-400'}`}>
            {e.currentBalance.toLocaleString()}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loyalty Programme</h1>
        <p className="text-gray-500 text-sm mt-0.5">Points leaderboard and redemption overview</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-24" />
            ))
          : statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bg}`}>{card.icon}</div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Top Customers by Loyalty Points</h2>
        <DataTable
          columns={columns}
          data={leaderboard as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyMessage="No loyalty data available."
        />
      </div>
    </div>
  )
}
