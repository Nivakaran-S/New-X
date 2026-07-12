'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'
import { apiPost } from '@/lib/api'
import type { ApiResponse, AuthTokens } from '@/types'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isWholesale = searchParams.get('type') === 'wholesale'
  const { login } = useAuthStore()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    isWholesale: isWholesale,
    businessName: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  function update(k: keyof typeof form, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('Please fill in all required fields')
      return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (form.isWholesale && !form.businessName) {
      toast.error('Please enter your business name')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        accountType: form.isWholesale ? 'WHOLESALE' : 'RETAIL',
        businessName: form.isWholesale ? form.businessName : undefined,
      }
      const res = await apiPost<ApiResponse<AuthTokens>>('/auth/register', payload)
      if (res.data) {
        login(res.data.accessToken, res.data.user as Parameters<typeof login>[1])
        toast.success('Account created! Welcome to Wonderland.')
        router.push('/')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
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
          <h1 className="text-xl font-bold text-gray-900 mt-4">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Already have one?{' '}
            <Link href="/login" className="text-brand-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Saman Perera"
              required
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+94 77 123 4567"
              required
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full h-12 px-4 pr-11 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Wholesale checkbox */}
          <label className="flex items-start gap-3 cursor-pointer bg-gray-50 rounded-xl p-3 border border-gray-100">
            <input
              type="checkbox"
              checked={form.isWholesale}
              onChange={(e) => update('isWholesale', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-brand-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Apply for Wholesale Account</p>
              <p className="text-xs text-gray-500">Get bulk pricing for your shop or business</p>
            </div>
          </label>

          {/* Business name field — shown when wholesale checked */}
          {form.isWholesale && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder="e.g. ABC Pharmacy, Saman Stores"
                className="w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your account will be reviewed within 24 hours.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold rounded-xl transition-all active:scale-95 touch-target"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-brand-600 hover:underline">terms</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}
