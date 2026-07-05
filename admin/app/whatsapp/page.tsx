'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { cn } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Conversation {
  id: string
  customerPhone: string
  customerName?: string
  lastMessage?: string
  status: 'BOT' | 'HUMAN' | 'RESOLVED'
  assignedTo?: string
  updatedAt: string
}

const STATUS_TABS = ['ALL', 'BOT', 'HUMAN', 'RESOLVED']

const STATUS_BADGE: Record<string, string> = {
  BOT: 'bg-blue-100 text-blue-700',
  HUMAN: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<string, string> = {
  BOT: 'Bot',
  HUMAN: 'Needs Attention',
  RESOLVED: 'Resolved',
}

export default function WhatsAppPage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<Conversation[]>('/whatsapp/conversations', token)
      setConversations(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const filtered = activeTab === 'ALL'
    ? conversations
    : conversations.filter((c) => c.status === activeTab)

  function formatDate(s: string) {
    const d = new Date(s)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'customerPhone',
      header: 'Customer',
      render: (row) => {
        const c = row as unknown as Conversation
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={14} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{c.customerName ?? c.customerPhone}</p>
              {c.customerName && <p className="text-xs text-gray-400">{c.customerPhone}</p>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'lastMessage',
      header: 'Last Message',
      render: (row) => {
        const c = row as unknown as Conversation
        return (
          <span className="text-sm text-gray-600 truncate max-w-xs block">
            {c.lastMessage ?? <span className="text-gray-300 italic">No messages</span>}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const c = row as unknown as Conversation
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[c.status] ?? c.status}
          </span>
        )
      },
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (row) => {
        const c = row as unknown as Conversation
        return c.assignedTo
          ? <span className="text-sm text-gray-600">{c.assignedTo}</span>
          : <span className="text-gray-300 text-sm">—</span>
      },
    },
    {
      key: 'updatedAt',
      header: 'Last Active',
      sortable: true,
      render: (row) => {
        const c = row as unknown as Conversation
        return <span className="text-xs text-gray-500">{formatDate(c.updatedAt)}</span>
      },
    },
  ]

  const humanCount = conversations.filter((c) => c.status === 'HUMAN').length

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          {humanCount > 0 && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
              {humanCount} need attention
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm mt-0.5">{filtered.length} conversation{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'ALL' ? conversations.length : conversations.filter((c) => c.status === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
                tab === 'HUMAN' && count > 0 && activeTab !== tab && 'text-orange-600',
              )}
            >
              {tab === 'HUMAN' ? 'Human' : tab === 'ALL' ? 'All' : tab === 'BOT' ? 'Bot' : 'Resolved'}
              {!loading && (
                <span className={cn('ml-1.5 text-xs', tab === 'HUMAN' && count > 0 ? 'text-orange-500 font-bold' : 'text-gray-400')}>
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        onRowClick={(row) => router.push(`/whatsapp/${(row as unknown as Conversation).id}`)}
        loading={loading}
        emptyMessage="No conversations found."
      />
    </div>
  )
}
