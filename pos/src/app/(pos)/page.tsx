'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useTransition,
} from 'react'
import toast from 'react-hot-toast'
import { ScanLine, Search, Loader2, ShoppingCart, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { useAuthStore, useTransactionStore } from '@/lib/store'
import { ProductSearchResult, type ProductVariantWithProduct } from '@/components/pos/ProductSearchResult'
import { TransactionItem } from '@/components/pos/TransactionItem'
import { PaymentPanel } from '@/components/pos/PaymentPanel'
import { CustomerLookup } from '@/components/pos/CustomerLookup'
import { ReceiptModal } from '@/components/pos/ReceiptModal'
import type {
  ProductWithDetails,
  OrderWithDetails,
  UnitType,
} from '@/types'

function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PosPage() {
  const token = useAuthStore((s) => s.token)

  // Transaction store
  const {
    items,
    customer,
    paymentMethod,
    cashReceived,
    referenceNo,
    addItem,
    removeItem,
    updateQty,
    setCustomer,
    setPaymentMethod,
    setCashReceived,
    setReferenceNo,
    clearTransaction,
    subtotal,
    total,
    change,
  } = useTransactionStore()

  // Local state
  const [barcodeInput, setBarcodeInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductWithDetails[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<OrderWithDetails | null>(
    null,
  )
  const [lastChange, setLastChange] = useState(0)
  const [isSubmitting, startSubmit] = useTransition()

  const barcodeRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus barcode on mount and after closing receipt
  useEffect(() => {
    barcodeRef.current?.focus()
  }, [])

  // Keyboard shortcut: F2 = focus barcode, F3 = focus search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        barcodeRef.current?.focus()
      } else if (e.key === 'F3') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape') {
        setSearchResults([])
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Barcode scan handler
  async function handleBarcodeScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const code = barcodeInput.trim()
    if (!code) return
    setBarcodeInput('')
    setBarcodeLoading(true)
    try {
      const product = await apiGet<ProductWithDetails>(
        `/products/barcode/${encodeURIComponent(code)}`,
        token ?? undefined,
      )
      if (!product) {
        toast.error(`Barcode not found: ${code}`)
        return
      }
      const variant = product.variants[0]
      if (!variant) {
        toast.error('Product has no variants')
        return
      }
      const price =
        typeof variant.wholesalePrice === 'string'
          ? parseFloat(variant.wholesalePrice)
          : Number(variant.wholesalePrice)
      const variantWithProduct: ProductVariantWithProduct = {
        ...variant,
        // ProductWithDetails extends Product; cast is safe here
        product: product as unknown as import('@/types').Product,
      }
      addItem(variantWithProduct, 'UNIT', price)
      toast.success(`Added: ${product.name}`, { duration: 1500 })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Not found: ${code}`)
    } finally {
      setBarcodeLoading(false)
    }
  }

  // Product search
  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSearchResults([])
        return
      }
      setSearchLoading(true)
      try {
        const results = await apiGet<ProductWithDetails[]>(
          `/products?search=${encodeURIComponent(q)}&isActive=true`,
          token ?? undefined,
        )
        setSearchResults(Array.isArray(results) ? results : [])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    },
    [token],
  )

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearchQuery(val)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => runSearch(val), 300)
  }

  // Add item from search result
  function handleAddItem(
    variant: ProductVariantWithProduct,
    unitType: UnitType,
    price: number,
  ) {
    addItem(variant, unitType, price)
    toast.success(`Added: ${variant.product.name} (${unitType})`, {
      duration: 1200,
    })
    setSearchQuery('')
    setSearchResults([])
    barcodeRef.current?.focus()
  }

  // Confirm sale
  function handleConfirm() {
    startSubmit(async () => {
      try {
        const orderItems = items.map((item) => ({
          variantId: item.variantId,
          qty: item.qty,
          unitType: item.unitType,
          unitPrice: item.unitPrice,
        }))

        const body: Record<string, unknown> = {
          source: 'POS',
          fulfillmentType: 'PICKUP',
          items: orderItems,
          paymentMethod,
          ...(customer ? { customerId: customer.id } : {}),
          ...(paymentMethod === 'BANK_TRANSFER'
            ? { referenceNo: referenceNo.trim() }
            : {}),
          ...(paymentMethod === 'CASH' ? { cashReceived } : {}),
        }

        const order = await apiPost<OrderWithDetails>(
          '/orders',
          body,
          token ?? undefined,
        )

        const savedChange = change()
        setLastChange(savedChange)
        setCompletedOrder(order)
        toast.success(`Order #${order.orderNumber} confirmed!`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to confirm sale',
        )
      }
    })
  }

  function handleNewSale() {
    clearTransaction()
    setCompletedOrder(null)
    setLastChange(0)
    setBarcodeInput('')
    setSearchQuery('')
    setSearchResults([])
    setTimeout(() => barcodeRef.current?.focus(), 100)
  }

  const subtotalValue = subtotal()
  const totalValue = total()
  const changeValue = change()
  const discountTotal = items.reduce((s, i) => s + i.discount, 0)

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT PANEL: Product search ────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-slate-700 overflow-hidden">
        {/* Search inputs */}
        <div className="flex-none p-3 space-y-2 bg-slate-850 border-b border-slate-700">
          {/* Barcode scan */}
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              placeholder="Scan barcode (Enter to add) — F2"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition font-mono"
            />
            {barcodeLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 animate-spin" />
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search products by name, SKU… — F3"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {searchResults.length > 0 ? (
            <>
              <p className="text-xs text-slate-500 font-medium px-1">
                {searchResults.length} result
                {searchResults.length !== 1 ? 's' : ''} — click a price to add
              </p>
              {searchResults.map((product) => (
                <ProductSearchResult
                  key={product.id}
                  product={product}
                  onAdd={handleAddItem}
                />
              ))}
            </>
          ) : searchQuery && !searchLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600">
              <Search className="w-8 h-8 mb-2" />
              <p className="text-sm">No products found</p>
            </div>
          ) : !searchQuery ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-700">
              <ScanLine className="w-10 h-10 mb-3" />
              <p className="text-sm font-medium">Ready to scan</p>
              <p className="text-xs mt-1 text-slate-600">
                Scan a barcode or type to search
              </p>
              <div className="mt-4 flex flex-col items-center gap-1 text-xs text-slate-700">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-500 font-mono">
                    F2
                  </kbd>{' '}
                  Focus barcode
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-500 font-mono">
                    F3
                  </kbd>{' '}
                  Focus search
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── RIGHT PANEL: Transaction ──────────────────────────────────── */}
      <div className="flex flex-col w-[360px] shrink-0 overflow-hidden">
        {/* Customer lookup */}
        <div className="flex-none p-3 border-b border-slate-700">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Customer
          </p>
          <CustomerLookup selected={customer} onSelect={setCustomer} />
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-700">
              <ShoppingCart className="w-8 h-8 mb-2" />
              <p className="text-sm">No items yet</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={clearTransaction}
                  className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              </div>
              {items.map((item) => (
                <TransactionItem
                  key={`${item.variantId}-${item.unitType}`}
                  item={item}
                  onUpdateQty={updateQty}
                  onRemove={removeItem}
                />
              ))}
            </>
          )}
        </div>

        {/* Totals */}
        <div className="flex-none border-t border-slate-700 px-3 py-3 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Subtotal</span>
            <span className="tabular-nums font-medium">
              {formatLKR(subtotalValue)}
            </span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-xs text-green-400">
              <span>Discount</span>
              <span className="tabular-nums font-medium">
                - {formatLKR(discountTotal)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-slate-700">
            <span>TOTAL</span>
            <span className="tabular-nums text-brand-400">
              {formatLKR(totalValue)}
            </span>
          </div>
        </div>

        {/* Payment panel */}
        <div className="flex-none border-t border-slate-700 p-3">
          <PaymentPanel
            paymentMethod={paymentMethod}
            cashReceived={cashReceived}
            referenceNo={referenceNo}
            total={totalValue}
            change={changeValue}
            customer={customer}
            hasItems={items.length > 0}
            isSubmitting={isSubmitting}
            onSetMethod={setPaymentMethod}
            onSetCashReceived={setCashReceived}
            onSetReferenceNo={setReferenceNo}
            onConfirm={handleConfirm}
          />
        </div>
      </div>

      {/* Receipt modal */}
      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          change={lastChange}
          onClose={() => setCompletedOrder(null)}
          onNewSale={handleNewSale}
        />
      )}
    </div>
  )
}
