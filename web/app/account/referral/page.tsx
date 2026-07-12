'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Copy, CheckCheck, Users, Star, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import type { ApiResponse } from '@/types'

interface ReferralData {
  code: string
  referralCount: number
  bonusPointsEarned: number
  pendingReferrals: number
}

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://wonderland.lk'

export default function ReferralPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user || !token) {
      router.push('/login?next=/account/referral')
      return
    }
    apiGet<ApiResponse<ReferralData>>('/referral/my-code', token)
      .then((res) => setReferral(res.data ?? null))
      .catch(() => setReferral(null))
      .finally(() => setLoading(false))
  }, [user, token, router])

  const referralLink = referral ? `${WEB_URL}?ref=${referral.code}` : ''

  async function copyLink() {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Referral link copied!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Could not copy — please copy manually')
    }
  }

  function shareWhatsApp() {
    if (!referralLink) return
    const text = encodeURIComponent(
      `Hey! I use Wonderland for wholesale FMCG — great prices and fast delivery. Sign up with my link and get started: ${referralLink}`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-white border border-gray-100 rounded-2xl h-40" />
        <div className="bg-white border border-gray-100 rounded-2xl h-28" />
        <div className="bg-white border border-gray-100 rounded-2xl h-48" />
      </div>
    )
  }

  if (!referral) {
    return (
      <div className="text-center py-16">
        <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Referral program unavailable</h2>
        <p className="text-gray-500 text-sm">Please contact support to set up your referral code.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Referral Program</h1>

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-green-200">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-green-200" />
          <p className="text-green-100 text-sm font-medium">Your Referral Code</p>
        </div>
        <p className="text-4xl font-extrabold tracking-widest mb-4">{referral.code}</p>

        {/* Link display */}
        <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2 mb-4">
          <p className="flex-1 text-xs text-green-100 truncate font-mono">{referralLink}</p>
          <button
            onClick={copyLink}
            className="flex-shrink-0 flex items-center gap-1.5 bg-white text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-3">
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Link
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b858] rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            <span className="text-base leading-none">💬</span>
            WhatsApp
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-gray-900">{referral.referralCount}</p>
          <p className="text-xs text-gray-500">Referred</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-gray-900">{referral.bonusPointsEarned}</p>
          <p className="text-xs text-gray-500">Points Earned</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xl font-extrabold text-gray-900">{referral.pendingReferrals}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-900">How It Works</p>
        </div>
        <div className="p-4 space-y-0">
          {[
            {
              step: '1',
              title: 'Share your code',
              desc: 'Send your unique referral link to friends or fellow shop owners.',
              emoji: '📤',
            },
            {
              step: '2',
              title: 'They sign up',
              desc: 'Your friend registers on Wonderland using your referral link.',
              emoji: '📝',
            },
            {
              step: '3',
              title: 'They place an order',
              desc: 'Your friend places their first order on Wonderland.',
              emoji: '🛒',
            },
            {
              step: '4',
              title: 'You earn 100 points',
              desc: 'Once their order is delivered, 100 bonus points are added to your account.',
              emoji: '🎉',
            },
          ].map((item, idx, arr) => (
            <div key={item.step} className="flex gap-4 relative">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0 z-10">
                  {item.emoji}
                </div>
                {idx < arr.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-100 my-1" />
                )}
              </div>
              <div className={`flex-1 ${idx < arr.length - 1 ? 'pb-4' : ''}`}>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms callout */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">Terms</p>
        <p>Referral points are credited once your friend's first order is delivered. Maximum 50 referrals per account. Wonderland reserves the right to modify the referral program at any time.</p>
      </div>
    </div>
  )
}
