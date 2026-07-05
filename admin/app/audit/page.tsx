'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface AuditLog {
  id: string
  action: string
  entity?: string
  entityId?: string
  userId?: string
  userName?: string
  userEmail?: string
  user?: { id: string; name?: string; email?: string }
  ipAddress?: string
  payload?: Record<string, unknown>
  createdAt: string
  timestamp?: string
}

interface AuditResponse {
  data?: AuditLog[]
  logs?: AuditLog[]
  total?: number
  page?: number
  pages?: number
}

function formatDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AuditPage() {
  const { token } = useAuthStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '25')
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (actionFilter.trim()) params.set('action', actionFilter.trim())
      if (userFilter.trim()) params.set('userId', userFilter.trim())

      const path = `/audit/logs?${params.toString()}`
      let result: AuditLog[] | AuditResponse
      try {
        result = await apiGet<AuditLog[] | AuditResponse>(path, token)
      } catch {
        // fallback to /audit
        result = await apiGet<AuditLog[] | AuditResponse>(`/audit?${params.toString()}`, token)
      }

      if (Array.isArray(result)) {
        setLogs(result)
        setTotalPages(1)
      } else {
        const items = result.data ?? result.logs ?? []
        setLogs(items)
        setTotalPages(result.pages ?? 1)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [token, page, fromDate, toDate, actionFilter, userFilter])

  useEffect(() => { load() }, [load])

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load()
  }

  function getUserLabel(log: AuditLog) {
    return log.user?.name || log.userName || log.user?.email || log.userEmail || log.userId || '—'
  }

  function getTimestamp(log: AuditLog) {
    return log.createdAt || log.timestamp || ''
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-0.5">View all system actions and changes</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilterSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. CREATE, UPDATE"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">User ID / Email</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Filter by user"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={() => {
              setFromDate('')
              setToDate('')
              setActionFilter('')
              setUserFilter('')
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-8" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Entity ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">IP Address</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {expandedId === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-gray-100 text-gray-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.entity || '—'}</td>
                    <td className="px-4 py-3">
                      {log.entityId ? (
                        <span className="font-mono text-xs text-gray-500">{log.entityId.slice(0, 10)}…</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{getUserLabel(log)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(getTimestamp(log))}</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-payload`}>
                      <td colSpan={7} className="px-4 py-3 bg-gray-50">
                        <div className="text-xs font-semibold text-gray-500 mb-1">Payload</div>
                        <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                          {log.payload ? JSON.stringify(log.payload, null, 2) : 'No payload'}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 rounded border text-xs font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
