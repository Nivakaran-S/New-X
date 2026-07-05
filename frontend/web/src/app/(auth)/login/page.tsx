'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'
import { apiPost } from '@/lib/api'
import type { ApiResponse, AuthTokens } from '@healplace/types'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const { login } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<ApiResponse<AuthTokens>>('/auth/login', { email, password })
      if (res.data) {
        login(res.data.accessToken, res.data.user as Parameters<typeof login>[1])
        toast.success('Welcome back!')
        router.push(next)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block font-bold text-2xl text-brand-600">
            Heal<span className="text-gray-900">Place</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-4">Sign in to your account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Or{' '}
            <Link href="/checkout" className="text-brand-600 hover:underline font-medium">
              continue as guest
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full h-12 px-4 pr-11 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-target"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold rounded-xl transition-all active:scale-95 touch-target"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-600 hover:underline font-medium">
            Create one
          </Link>
        </p>

        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Are you a wholesaler?{' '}
            <Link href="/wholesale" className="text-brand-600 hover:underline">
              Apply for a wholesale account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
