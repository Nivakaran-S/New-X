'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ArrowLeft, MapPin, ShoppingBag, TrendingUp, Eye } from 'lucide-react'
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

interface Visit {
  id: string
  customerName: string
  date: string
  location?: string
  orderTaken: boolean
  orderId?: string
}

interface Route {
  id: string
  name: string
  stops: number
  scheduledDate?: string
}

interface TerritoryAnalytics {
  totalCustomers: number
  activeCustomers: number
  revenueThisMonth: number
  avgOrderValue: number
}

export default function RepDetailPage() {
  const { repId } = useParams<{ repId: string }>()
  const { token } = useAuthStore()
  const router = useRouter()
  const [rep, setRep] = useState<SalesRep | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [analytics, setAnalytics] = useState<TerritoryAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token || !repId) return
    setLoading(true)
    try {
      const [repData, visitsData, routesData, analyticsData] = await Promise.allSettled([
        apiGet<SalesRep>(`/crm/reps/${repId}`, token),
        apiGet<Visit[]>(`/crm/visits?repId=${repId}`, token),
        apiGet<Route[]>(`/crm/routes?repId=${repId}`, token),
        apiGet<TerritoryAnalytics>(`/crm/analytics/${repId}`, token),
      ])
      if (repData.status === 'fulfilled') setRep(repData.value)
      if (visitsData.status === 'fulfilled') setVisits(Array.isArray(visitsData.value) ? visitsData.value : [])
      if (routesData.status === 'fulfilled') setRoutes(Array.isArray(routesData.value) ? routesData.value : [])
      if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load rep details')
    } finally {
      setLoading(false)
    }
  }, [token, repId])

  useEffect(() => {
    load()
  }, [load])

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const visitColumns: Column<Record<string, unknown>>[] = [
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (row) => {
        const v = row as unknown as Visit
        return <span className="font-medium text-gray-900">{v.customerName}</span>
      },
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => {
        const v = row as unknown as Visit
        return <span className="text-xs text-gray-500">{formatDate(v.date)}</span>
      },
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => {
        const v = row as unknown as Visit
        return v.location ? (
          <span className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin size={12} className="text-gray-400" />
            {v.location}
          </span>
        ) : <span className="text-gray-300">—</span>
      },
    },
    {
      key: 'orderTaken',
      header: 'Order Taken',
      render: (row) => {
        const v = row as unknown as Visit
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.orderTaken ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {v.orderTaken ? 'Yes' : 'No'}
          </span>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!rep) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Sales rep not found.</p>
        <button onClick={() => router.push('/crm')} className="mt-4 text-sm text-brand-600 hover:underline">
          Back to CRM
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/crm')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{rep.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{rep.email}</p>
        </div>
        {rep.territory && (
          <span className="ml-2 text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
            {rep.territory}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Visits (MTD)', value: rep.visitsThisMonth, icon: <Eye size={18} className="text-blue-500" /> },
          { label: 'Orders (MTD)', value: rep.ordersThisMonth, icon: <ShoppingBag size={18} className="text-green-500" /> },
          { label: 'Conversion Rate', value: `${rep.conversionRate.toFixed(1)}%`, icon: <TrendingUp size={18} className="text-purple-500" /> },
          { label: 'Territory Customers', value: analytics?.totalCustomers ?? '—', icon: <MapPin size={18} className="text-orange-500" /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              {stat.icon}
              <p className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Territory analytics */}
      {analytics && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Territory Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400">Total Customers</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{analytics.totalCustomers}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Active Customers</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{analytics.activeCustomers}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Revenue (MTD)</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">₦{analytics.revenueThisMonth?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Avg Order Value</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">₦{analytics.avgOrderValue?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Routes */}
      {routes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Assigned Routes</h2>
          <div className="space-y-2">
            {routes.map((route) => (
              <div key={route.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{route.name}</p>
                  <p className="text-xs text-gray-400">{route.stops} stops</p>
                </div>
                {route.scheduledDate && (
                  <span className="text-xs text-gray-500">{formatDate(route.scheduledDate)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit log */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Visit Log</h2>
        <DataTable
          columns={visitColumns}
          data={visits as unknown as Record<string, unknown>[]}
          loading={false}
          emptyMessage="No visits recorded."
        />
      </div>
    </div>
  )
}
