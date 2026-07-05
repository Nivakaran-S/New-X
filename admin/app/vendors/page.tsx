'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Plus, Loader2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Vendor {
  id: string
  brand: string
  userEmail: string
  canViewSales: boolean
  canViewStock: boolean
  canViewRetailers: boolean
  createdAt: string
}

interface RegisterForm {
  brand: string
  email: string
  password: string
  canViewSales: boolean
  canViewStock: boolean
  canViewRetailers: boolean
}

const EMPTY_FORM: RegisterForm = {
  brand: '',
  email: '',
  password: '',
  canViewSales: false,
  canViewStock: true,
  canViewRetailers: false,
}

export default function VendorsPage() {
  const { token } = useAuthStore()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM)
  const [registering, setRegistering] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<Pick<Vendor, 'canViewSales' | 'canViewStock' | 'canViewRetailers'> | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<Vendor[]>('/vendors/admin', token)
      setVendors(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setRegistering(true)
    try {
      await apiPost('/vendors/admin/register', form, token)
      toast.success('Vendor registered')
      setShowDialog(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register vendor')
    } finally {
      setRegistering(false)
    }
  }

  function startEditPerms(vendor: Vendor) {
    setEditingId(vendor.id)
    setEditPerms({
      canViewSales: vendor.canViewSales,
      canViewStock: vendor.canViewStock,
      canViewRetailers: vendor.canViewRetailers,
    })
  }

  async function savePerms(vendor: Vendor) {
    if (!token || !editPerms) return
    setSavingId(vendor.id)
    try {
      await apiPatch(`/vendors/admin/${vendor.id}`, editPerms, token)
      setVendors((prev) =>
        prev.map((v) => (v.id === vendor.id ? { ...v, ...editPerms } : v)),
      )
      toast.success('Permissions updated')
      setEditingId(null)
      setEditPerms(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update permissions')
    } finally {
      setSavingId(null)
    }
  }

  function PermCheckbox({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        {label}
      </label>
    )
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'brand',
      header: 'Brand',
      sortable: true,
      render: (row) => {
        const v = row as unknown as Vendor
        return <span className="font-semibold text-gray-900">{v.brand}</span>
      },
    },
    {
      key: 'userEmail',
      header: 'User Email',
      render: (row) => {
        const v = row as unknown as Vendor
        return <span className="text-sm text-gray-600">{v.userEmail}</span>
      },
    },
    {
      key: 'canViewSales',
      header: 'Sales',
      render: (row) => {
        const v = row as unknown as Vendor
        if (editingId === v.id && editPerms) {
          return (
            <PermCheckbox
              label="Sales"
              value={editPerms.canViewSales}
              onChange={(val) => setEditPerms((p) => p ? { ...p, canViewSales: val } : p)}
            />
          )
        }
        return v.canViewSales
          ? <Check size={14} className="text-green-600" />
          : <X size={14} className="text-gray-300" />
      },
    },
    {
      key: 'canViewStock',
      header: 'Stock',
      render: (row) => {
        const v = row as unknown as Vendor
        if (editingId === v.id && editPerms) {
          return (
            <PermCheckbox
              label="Stock"
              value={editPerms.canViewStock}
              onChange={(val) => setEditPerms((p) => p ? { ...p, canViewStock: val } : p)}
            />
          )
        }
        return v.canViewStock
          ? <Check size={14} className="text-green-600" />
          : <X size={14} className="text-gray-300" />
      },
    },
    {
      key: 'canViewRetailers',
      header: 'Retailers',
      render: (row) => {
        const v = row as unknown as Vendor
        if (editingId === v.id && editPerms) {
          return (
            <PermCheckbox
              label="Retailers"
              value={editPerms.canViewRetailers}
              onChange={(val) => setEditPerms((p) => p ? { ...p, canViewRetailers: val } : p)}
            />
          )
        }
        return v.canViewRetailers
          ? <Check size={14} className="text-green-600" />
          : <X size={14} className="text-gray-300" />
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const v = row as unknown as Vendor
        if (editingId === v.id) {
          return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => savePerms(v)}
                disabled={savingId === v.id}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {savingId === v.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save
              </button>
              <button
                onClick={() => { setEditingId(null); setEditPerms(null) }}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); startEditPerms(v) }}
            className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Permissions
          </button>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-500 text-sm mt-0.5">Brand principal portal access management</p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          Register Vendor
        </button>
      </div>

      <DataTable
        columns={columns}
        data={vendors as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No vendors registered."
      />

      {/* Register dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Register Vendor</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                <input
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Indomie"
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                <input
                  required
                  type="email"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="vendor@brand.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input
                  required
                  type="password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Portal Permissions</label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                  {[
                    { key: 'canViewSales', label: 'View Sales Data' },
                    { key: 'canViewStock', label: 'View Stock Levels' },
                    { key: 'canViewRetailers', label: 'View Retailers' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form[key as keyof RegisterForm] as boolean}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={registering}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {registering && <Loader2 size={15} className="animate-spin" />}
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDialog(false); setForm(EMPTY_FORM) }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
