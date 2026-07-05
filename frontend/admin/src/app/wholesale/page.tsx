'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPatch } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { CheckCircle, Loader2, Search, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SafeUser } from '@healplace/types'

interface WholesaleBuyer extends SafeUser {
  businessName?: string
  createdAt: string
}

export default function WholesalePage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [buyers, setBuyers] = useState<WholesaleBuyer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<WholesaleBuyer[]>('/users?role=WHOLESALE_BUYER&isApproved=false&limit=200', token)
      setBuyers(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load wholesale buyers')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const filtered = buyers.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.businessName?.toLowerCase().includes(q) ||
      b.phone?.toLowerCase().includes(q)
    )
  })

  async function handleApprove(buyer: WholesaleBuyer) {
    if (!token) return
    setApprovingId(buyer.id)
    try {
      await apiPatch(`/users/${buyer.id}/approve`, {}, token)
      toast.success(`${buyer.name ?? buyer.email} approved`)
      setBuyers((prev) => prev.filter((b) => b.id !== buyer.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setApprovingId(null)
    }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => {
        const b = row as unknown as WholesaleBuyer
        return (
          <div>
            <p className="font-medium text-gray-900">{b.name ?? '—'}</p>
            <p className="text-xs text-gray-400">{b.email}</p>
          </div>
        )
      },
    },
    {
      key: 'businessName',
      header: 'Business Name',
      render: (row) => {
        const b = row as unknown as WholesaleBuyer
        return <span className="text-sm text-gray-700">{b.businessName ?? '—'}</span>
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => {
        const b = row as unknown as WholesaleBuyer
        return <span className="text-sm text-gray-600">{b.phone ?? '—'}</span>
      },
    },
    {
      key: 'createdAt',
      header: 'Applied',
      sortable: true,
      render: (row) => {
        const b = row as unknown as WholesaleBuyer
        return <span className="text-xs text-gray-500">{formatDate(b.createdAt)}</span>
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const b = row as unknown as WholesaleBuyer
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleApprove(b)}
              disabled={approvingId === b.id}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {approvingId === b.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle size={12} />
              )}
              Approve
            </button>
            <button
              onClick={() => router.push(`/customers/${b.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium rounded-lg transition-colors"
            >
              <ExternalLink size={12} />
              Profile
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wholesale Approvals</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {filtered.length} buyer{filtered.length !== 1 ? 's' : ''} pending approval
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, business, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {!loading && buyers.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
          <p className="font-medium text-green-800">All clear!</p>
          <p className="text-sm text-green-600 mt-1">No wholesale buyers pending approval.</p>
        </div>
      )}

      {(loading || buyers.length > 0) && (
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          onRowClick={(row) => router.push(`/customers/${(row as unknown as WholesaleBuyer).id}`)}
          loading={loading}
          emptyMessage="No results match your search."
        />
      )}
    </div>
  )
}
