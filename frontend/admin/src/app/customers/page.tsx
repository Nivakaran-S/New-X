'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import { Search, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SafeUser } from '@healplace/types'

interface CustomerRow extends SafeUser {
  totalSpend?: number
  orderCount?: number
  tier?: string
}

const ROLE_FILTERS = ['ALL', 'WHOLESALE_BUYER', 'CUSTOMER']

const TIER_BADGE: Record<string, string> = {
  BRONZE: 'bg-orange-100 text-orange-700',
  SILVER: 'bg-gray-100 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-700',
  PLATINUM: 'bg-purple-100 text-purple-700',
}

export default function CustomersPage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<CustomerRow[]>('/users?limit=200', token)
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    const matchRole = roleFilter === 'ALL' || c.role === roleFilter
    return matchSearch && matchRole
  })

  async function handleApprove(customerId: string) {
    if (!token) return
    setApprovingId(customerId)
    try {
      await apiPost(`/users/${customerId}/approve-wholesale`, {}, token)
      toast.success('Wholesale account approved')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setApprovingId(null)
    }
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => {
        const c = row as unknown as CustomerRow
        return (
          <div>
            <p className="font-medium text-gray-900">{c.name ?? '—'}</p>
            <p className="text-xs text-gray-400">{c.email}</p>
          </div>
        )
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span className="text-sm text-gray-600">{(row as unknown as CustomerRow).phone ?? '—'}</span>,
    },
    {
      key: 'role',
      header: 'Type',
      render: (row) => {
        const c = row as unknown as CustomerRow
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
            {c.role === 'WHOLESALE_BUYER' ? 'Wholesale' : 'Retail'}
          </span>
        )
      },
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (row) => {
        const c = row as unknown as CustomerRow
        if (!c.tier) return <span className="text-gray-300">—</span>
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BADGE[c.tier] ?? 'bg-gray-100 text-gray-600'}`}>
            {c.tier}
          </span>
        )
      },
    },
    {
      key: 'totalSpend',
      header: 'Total Spend',
      sortable: true,
      render: (row) => {
        const c = row as unknown as CustomerRow
        return c.totalSpend != null ? formatCurrency(c.totalSpend) : '—'
      },
    },
    {
      key: 'orderCount',
      header: 'Orders',
      sortable: true,
      render: (row) => <span>{(row as unknown as CustomerRow).orderCount ?? '—'}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => {
        const c = row as unknown as CustomerRow
        const pending = c.role === 'WHOLESALE_BUYER' && !(c as { wholesaleApproved?: boolean }).wholesaleApproved
        if (pending) {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleApprove(c.id)
              }}
              disabled={approvingId === c.id}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              {approvingId === c.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
              Approve
            </button>
          )
        }
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {c.isActive ? 'Active' : 'Inactive'}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 text-sm mt-0.5">{filtered.length} customers</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {ROLE_FILTERS.map((r) => (
            <option key={r} value={r}>
              {r === 'ALL' ? 'All Types' : r === 'WHOLESALE_BUYER' ? 'Wholesale' : 'Retail'}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        onRowClick={(row) => router.push(`/customers/${(row as unknown as CustomerRow).id}`)}
        loading={loading}
        emptyMessage="No customers found."
      />
    </div>
  )
}
