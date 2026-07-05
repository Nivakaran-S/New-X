'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { CheckCircle, XCircle, Clock, FileText, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface IrdSubmission {
  id: string
  invoiceNumber?: string
  orderNumber?: string
  orderId: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  submittedAt?: string
  retryCount?: number
  errorMessage?: string
}

type FilterTab = 'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING'

function formatDate(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function IrdPage() {
  const { token } = useAuthStore()
  const [submissions, setSubmissions] = useState<IrdSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    try {
      const data = await apiGet<IrdSubmission[]>('/ird/submissions', token)
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : 'Failed to load IRD submissions')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(() => load(true), 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  async function handleRetry(sub: IrdSubmission) {
    if (!token) return
    setRetryingId(sub.id)
    try {
      await apiPost(`/ird/submissions/${sub.orderId}/retry`, {}, token)
      toast.success('Retry triggered successfully')
      load(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to retry submission')
    } finally {
      setRetryingId(null)
    }
  }

  const total = submissions.length
  const successCount = submissions.filter((s) => s.status === 'SUCCESS').length
  const failedCount = submissions.filter((s) => s.status === 'FAILED').length
  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length

  const filtered = submissions.filter((s) => {
    if (activeTab === 'ALL') return true
    return s.status === activeTab
  })

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: total },
    { key: 'SUCCESS', label: 'Success', count: successCount },
    { key: 'FAILED', label: 'Failed', count: failedCount },
    { key: 'PENDING', label: 'Pending', count: pendingCount },
  ]

  const statusConfig = {
    SUCCESS: { label: 'Success', cls: 'bg-green-50 text-green-700', icon: <CheckCircle size={12} /> },
    FAILED: { label: 'Failed', cls: 'bg-red-50 text-red-700', icon: <XCircle size={12} /> },
    PENDING: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700', icon: <Clock size={12} /> },
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (row) => {
        const s = row as unknown as IrdSubmission
        return (
          <span className="font-mono text-sm font-semibold text-gray-900">
            {s.invoiceNumber || '—'}
          </span>
        )
      },
    },
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (row) => {
        const s = row as unknown as IrdSubmission
        return (
          <span className="font-mono text-sm text-gray-700">
            {s.orderNumber || s.orderId?.slice(0, 10) || '—'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const s = row as unknown as IrdSubmission
        const cfg = statusConfig[s.status] ?? statusConfig.PENDING
        return (
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${cfg.cls}`}>
            {cfg.icon}
            {cfg.label}
          </span>
        )
      },
    },
    {
      key: 'submittedAt',
      header: 'Submitted At',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500">{formatDate((row as unknown as IrdSubmission).submittedAt)}</span>
      ),
    },
    {
      key: 'retryCount',
      header: 'Retries',
      sortable: true,
      render: (row) => {
        const s = row as unknown as IrdSubmission
        return (
          <span className={`text-sm font-medium ${(s.retryCount ?? 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {s.retryCount ?? 0}
          </span>
        )
      },
    },
    {
      key: 'errorMessage',
      header: 'Error',
      render: (row) => {
        const s = row as unknown as IrdSubmission
        if (!s.errorMessage) return <span className="text-gray-300">—</span>
        return (
          <span className="text-xs text-red-600 max-w-xs block truncate" title={s.errorMessage}>
            {s.errorMessage}
          </span>
        )
      },
    },
    {
      key: 'retry',
      header: '',
      render: (row) => {
        const s = row as unknown as IrdSubmission
        if (s.status !== 'FAILED') return null
        const isRetrying = retryingId === s.id
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleRetry(s) }}
            disabled={isRetrying}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60"
          >
            {isRetrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Retry
          </button>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IRD RAMIS Submissions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Auto-refreshes every 60 seconds</p>
        </div>
        <button
          onClick={() => load()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100">
            <FileText size={18} className="text-gray-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Success</p>
            <p className="text-2xl font-bold text-green-700">{successCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50">
            <XCircle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Failed</p>
            <p className="text-2xl font-bold text-red-700">{failedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-50">
            <Clock size={18} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table with red highlight for failed rows */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Invoice #', 'Order #', 'Status', 'Submitted At', 'Retries', 'Error', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No submissions found.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const cfg = statusConfig[sub.status] ?? statusConfig.PENDING
                const isRetrying = retryingId === sub.id
                return (
                  <tr
                    key={sub.id}
                    className={sub.status === 'FAILED' ? 'bg-red-50/60' : 'hover:bg-gray-50 transition-colors'}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {sub.invoiceNumber || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-700">
                        {sub.orderNumber || sub.orderId?.slice(0, 10) || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${cfg.cls}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(sub.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${(sub.retryCount ?? 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {sub.retryCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.errorMessage ? (
                        <span className="text-xs text-red-600 max-w-xs block truncate" title={sub.errorMessage}>
                          {sub.errorMessage}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(sub)}
                          disabled={isRetrying}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60"
                        >
                          {isRetrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
