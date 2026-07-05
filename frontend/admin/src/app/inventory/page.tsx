'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Search, SlidersHorizontal, Loader2, Plus, Minus } from 'lucide-react'
import toast from 'react-hot-toast'

interface InventoryRow {
  id: string
  productName: string
  variantName: string
  warehouseName: string
  quantity: number
  reservedQty: number
  availableQty: number
  reorderLevel: number
  sku: string
  variantId: string
}

interface AdjustDialog {
  open: boolean
  inventoryId: string
  productName: string
  variantName: string
  current: number
  delta: string
  reason: string
  saving: boolean
}

const EMPTY_DIALOG: AdjustDialog = {
  open: false,
  inventoryId: '',
  productName: '',
  variantName: '',
  current: 0,
  delta: '',
  reason: '',
  saving: false,
}

export default function InventoryPage() {
  const { token } = useAuthStore()
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [dialog, setDialog] = useState<AdjustDialog>(EMPTY_DIALOG)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGet<InventoryRow[]>('/inventory', token)
      setInventory(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const filtered = inventory.filter((row) => {
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      row.productName?.toLowerCase().includes(q) ||
      row.variantName?.toLowerCase().includes(q) ||
      row.sku?.toLowerCase().includes(q) ||
      row.warehouseName?.toLowerCase().includes(q)
    const matchLow = !showLowStock || row.availableQty <= row.reorderLevel
    return matchSearch && matchLow
  })

  function openAdjust(row: InventoryRow) {
    setDialog({
      ...EMPTY_DIALOG,
      open: true,
      inventoryId: row.id,
      productName: row.productName,
      variantName: row.variantName,
      current: row.quantity,
    })
  }

  async function handleAdjust() {
    const delta = parseInt(dialog.delta, 10)
    if (isNaN(delta) || delta === 0) {
      toast.error('Enter a non-zero delta')
      return
    }
    if (!dialog.reason.trim()) {
      toast.error('Reason is required')
      return
    }
    setDialog((d) => ({ ...d, saving: true }))
    try {
      await apiPost(`/inventory/${dialog.inventoryId}/adjust`, { delta, reason: dialog.reason }, token!)
      toast.success('Stock adjusted')
      setDialog(EMPTY_DIALOG)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Adjust failed')
      setDialog((d) => ({ ...d, saving: false }))
    }
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (row) => {
        const r = row as unknown as InventoryRow
        return (
          <div>
            <p className="font-medium text-gray-900 text-sm">{r.productName}</p>
            <p className="text-xs text-gray-400">{r.variantName} · {r.sku}</p>
          </div>
        )
      },
    },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      render: (row) => (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {(row as unknown as InventoryRow).warehouseName ?? '—'}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock',
      sortable: true,
      render: (row) => {
        const r = row as unknown as InventoryRow
        const low = r.availableQty <= r.reorderLevel
        return (
          <span className={low ? 'text-red-600 font-semibold' : 'text-gray-700'}>
            {r.quantity}
            {low && <span className="text-xs ml-1 text-red-400">(low)</span>}
          </span>
        )
      },
    },
    {
      key: 'reservedQty',
      header: 'Reserved',
      render: (row) => <span className="text-yellow-600">{(row as unknown as InventoryRow).reservedQty}</span>,
    },
    {
      key: 'availableQty',
      header: 'Available',
      sortable: true,
      render: (row) => {
        const r = row as unknown as InventoryRow
        const low = r.availableQty <= r.reorderLevel
        return (
          <span className={low ? 'text-red-700 font-bold' : 'text-green-700 font-medium'}>
            {r.availableQty}
          </span>
        )
      },
    },
    {
      key: 'reorderLevel',
      header: 'Reorder At',
      render: (row) => <span className="text-gray-400">{(row as unknown as InventoryRow).reorderLevel}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            openAdjust(row as unknown as InventoryRow)
          }}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
        >
          <SlidersHorizontal size={12} />
          Adjust
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {filtered.length} items
          {filtered.filter((r) => r.availableQty <= r.reorderLevel).length > 0 && (
            <span className="text-red-500 ml-2">
              · {filtered.filter((r) => r.availableQty <= r.reorderLevel).length} low stock
            </span>
          )}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search product, SKU, warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="rounded"
          />
          Show low stock only
        </label>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No inventory items found."
      />

      {/* Adjust dialog */}
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Adjust Stock</h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{dialog.productName}</p>
              <p className="text-gray-400">{dialog.variantName}</p>
              <p className="mt-1">Current stock: <span className="font-semibold">{dialog.current}</span></p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delta (positive = add, negative = remove)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDialog((d) => ({ ...d, delta: String((parseInt(d.delta) || 0) - 1) }))}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  value={dialog.delta}
                  onChange={(e) => setDialog((d) => ({ ...d, delta: e.target.value }))}
                  className="flex-1 text-center px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => setDialog((d) => ({ ...d, delta: String((parseInt(d.delta) || 0) + 1) }))}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Plus size={14} />
                </button>
              </div>
              {dialog.delta && (
                <p className="text-xs text-gray-400 mt-1">
                  New stock: {dialog.current + (parseInt(dialog.delta) || 0)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <input
                type="text"
                value={dialog.reason}
                onChange={(e) => setDialog((d) => ({ ...d, reason: e.target.value }))}
                placeholder="e.g. Stocktake correction, Return"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDialog(EMPTY_DIALOG)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={dialog.saving}
                className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {dialog.saving && <Loader2 size={14} className="animate-spin" />}
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
