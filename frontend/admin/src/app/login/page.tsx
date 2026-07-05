'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiPost } from '@/lib/api'
import type { AuthTokens } from '@healplace/types'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    try {
      const data = await apiPost<AuthTokens>('/auth/login', { email, password })
      const role = data.user.role
      if (!['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'SALES_REP'].includes(role)) {
        toast.error('Access denied. Staff accounts only.')
        return
      }
      login(data.accessToken, data.user)
      router.replace('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-white">HealPlace Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-2xl p-8 space-y-5 shadow-xl"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="admin@healplace.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          HealPlace Wholesale Distribution Platform
        </p>
      </div>
    </div>
  )
}
