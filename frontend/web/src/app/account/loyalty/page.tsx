'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, TrendingUp, Gift, Info } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { formatLKRShort } from '@/lib/utils'
import type { ApiResponse } from '@healplace/types'

interface LoyaltyBalance {
  points: number
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  monthlySpend: number
  lifetimeSpend: number
  pointsValue: number // LKR value of current points
}

interface LoyaltyTransaction {
  id: string
  type: 'EARNED' | 'REDEEMED' | 'BONUS' | 'EXPIRED'
  points: number
  description: string
  createdAt: string
  orderId: string | null
}

const TIERS = [
  { key: 'BRONZE', label: 'Bronze', minSpend: 0, maxSpend: 25000, color: 'text-orange-700', bg: 'bg-orange-100', bar: 'bg-orange-500' },
  { key: 'SILVER', label: 'Silver', minSpend: 25000, maxSpend: 75000, color: 'text-gray-600', bg: 'bg-gray-100', bar: 'bg-gray-500' },
  { key: 'GOLD', label: 'Gold', minSpend: 75000, maxSpend: 200000, color: 'text-yellow-700', bg: 'bg-yellow-100', bar: 'bg-yellow-500' },
  { key: 'PLATINUM', label: 'Platinum', minSpend: 200000, maxSpend: Infinity, color: 'text-purple-700', bg: 'bg-purple-100', bar: 'bg-purple-500' },
]

const TX_TYPE_COLORS: Record<string, string> = {
  EARNED: 'text-green-600',
  BONUS: 'text-blue-600',
  REDEEMED: 'text-red-500',
  EXPIRED: 'text-gray-400',
}

export default function LoyaltyPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !token) {
      router.push('/login?next=/account/loyalty')
      return
    }
    Promise.all([
      apiGet<ApiResponse<LoyaltyBalance>>('/loyalty/balance', token),
      apiGet<ApiResponse<LoyaltyTransaction[]>>('/loyalty/transactions', token),
    ])
      .then(([balRes, txRes]) => {
        setBalance(balRes.data ?? null)
        setTransactions(txRes.data ?? [])
      })
      .catch(() => {
        // Fall back to user object data
        setBalance({
          points: user.loyaltyPoints ?? 0,
          tier: 'BRONZE',
          monthlySpend: 0,
          lifetimeSpend: 0,
          pointsValue: Math.floor((user.loyaltyPoints ?? 0) / 100) * 50,
        })
      })
      .finally(() => setLoading(false))
  }, [user, token, router])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-white border border-gray-100 rounded-2xl h-40" />
        <div className="bg-white border border-gray-100 rounded-2xl h-20" />
        <div className="bg-white border border-gray-100 rounded-2xl h-48" />
      </div>
    )
  }

  const points = balance?.points ?? user?.loyaltyPoints ?? 0
  const tier = balance?.tier ?? 'BRONZE'
  const monthlySpend = balance?.monthlySpend ?? 0
  const currentTierDef = TIERS.find((t) => t.key === tier) ?? TIERS[0]
  const nextTierDef = TIERS[TIERS.findIndex((t) => t.key === tier) + 1]
  const pointsValue = Math.floor(points / 100) * 50

  const tierProgress = nextTierDef
    ? Math.min(100, ((monthlySpend - currentTierDef.minSpend) / (nextTierDef.minSpend - currentTierDef.minSpend)) * 100)
    : 100

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Loyalty Points</h1>

      {/* Points hero */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 text-white shadow-lg shadow-green-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-green-100 text-sm font-medium">Your Points Balance</p>
            <p className="text-5xl font-extrabold mt-1 tracking-tight">{points.toLocaleString()}</p>
            <p className="text-green-100 text-sm mt-1">
              Worth <span className="text-white font-bold">{formatLKRShort(pointsValue)}</span> in discounts
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${currentTierDef.bg}`}>
            <Star className={`w-4 h-4 ${currentTierDef.color}`} />
            <span className={`text-sm font-bold ${currentTierDef.color}`}>{currentTierDef.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-green-500/50 pt-4">
          <div>
            <p className="text-green-200 text-xs">Points to redeem</p>
            <p className="font-bold">100 pts = LKR 50</p>
          </div>
          <div>
            <p className="text-green-200 text-xs">Points to earn</p>
            <p className="font-bold">LKR 10 = 1 point</p>
          </div>
        </div>
      </div>

      {/* Tier progress */}
      {nextTierDef && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Progress to {nextTierDef.label}
              </p>
              <p className="text-xs text-gray-500">
                Monthly spend: {formatLKRShort(monthlySpend)} / {formatLKRShort(nextTierDef.minSpend)}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${currentTierDef.bar}`}
              style={{ width: `${tierProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Spend {formatLKRShort(Math.max(0, nextTierDef.minSpend - monthlySpend))} more this month to reach {nextTierDef.label}
          </p>
        </div>
      )}

      {/* How to earn */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-green-600" />
          <p className="text-sm font-semibold text-green-800">How to Earn Points</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { emoji: '🛒', title: 'Every Purchase', desc: 'Earn 1 point per LKR 10 spent' },
            { emoji: '⭐', title: 'Redeem Discount', desc: '100 points = LKR 50 off your order' },
            { emoji: '👥', title: 'Refer a Friend', desc: 'Earn 100 bonus points per referral' },
            { emoji: '🏆', title: 'Tier Bonuses', desc: 'Gold & Platinum earn 2x points' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2.5">
              <span className="text-xl flex-shrink-0">{item.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-900">Tier Benefits</p>
        </div>
        <div className="divide-y divide-gray-50">
          {TIERS.map((t) => (
            <div
              key={t.key}
              className={`flex items-center gap-3 px-4 py-3 ${t.key === tier ? 'bg-green-50' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.bg}`}>
                <Star className={`w-4 h-4 ${t.color}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${t.color}`}>
                  {t.label}
                  {t.key === tier && (
                    <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">
                      Your tier
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {t.maxSpend === Infinity
                    ? `${formatLKRShort(t.minSpend)}+/month`
                    : `${formatLKRShort(t.minSpend)} – ${formatLKRShort(t.maxSpend)}/month`}
                </p>
              </div>
              <p className="text-xs font-semibold text-gray-600">
                {t.key === 'GOLD' || t.key === 'PLATINUM' ? '2× points' : '1× points'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-900">Points History</p>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <Gift className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString('en-LK', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <p className={`text-sm font-bold flex-shrink-0 ${TX_TYPE_COLORS[tx.type] ?? 'text-gray-600'}`}>
                  {tx.type === 'REDEEMED' || tx.type === 'EXPIRED' ? '-' : '+'}{tx.points} pts
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
