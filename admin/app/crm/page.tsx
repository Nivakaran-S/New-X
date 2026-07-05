'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface SalesRep {
  id: string
  name: string
  email: string
  territory?: string
  visitsThisMonth: number
  ordersThisMonth: number
  conversionRate: number
}

export default function CRMPage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [reps, setReps] = useState<SalesRep[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<SalesRep[]>('/crm/reps', token)
      setReps(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sales reps')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const filtered = reps.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.territory?.toLowerCase().includes(q)
    )
  })

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Rep Name',
      sortable: true,
      render: (row) => {
        const r = row as unknown as SalesRep
        return (
          <div>
            <p className="font-medium text-gray-900">{r.name}</p>
            <p className="text-xs text-gray-400">{r.email}</p>
          </div>
        )
      },
    },
    {
      key: 'territory',
      header: 'Territory',
      sortable: true,
      render: (row) => {
        const r = row as unknown as SalesRep
        return r.territory ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{r.territory}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )
      },
    },
    {
      key: 'visitsThisMonth',
      header: 'Visits (MTD)',
      sortable: true,
      render: (row) => {
        const r = row as unknown as SalesRep
        return <span className="font-semibold text-gray-900">{r.visitsThisMonth}</span>
      },
    },
    {
      key: 'ordersThisMonth',
      header: 'Orders (MTD)',
      sortable: true,
      render: (row) => {
        const r = row as unknown as SalesRep
        return <span className="font-semibold text-gray-900">{r.ordersThisMonth}</span>
      },
    },
    {
      key: 'conversionRate',
      header: 'Conversion Rate',
      sortable: true,
      render: (row) => {
        const r = row as unknown as SalesRep
        const pct = r.conversionRate
        const cls = pct >= 60 ? 'text-green-700' : pct >= 30 ? 'text-yellow-700' : 'text-red-600'
        return <span className={`font-semibold ${cls}`}>{pct.toFixed(1)}%</span>
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM / Sales Reps</h1>
        <p className="text-gray-500 text-sm mt-0.5">{filtered.length} sales rep{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, territory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        onRowClick={(row) => router.push(`/crm/${(row as unknown as SalesRep).id}`)}
        loading={loading}
        emptyMessage="No sales reps found."
      />
    </div>
  )
}
