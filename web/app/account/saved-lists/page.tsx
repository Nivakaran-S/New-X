'use client'

// NOTE: Saved lists are stored in localStorage until the backend /orders/saved-lists API
// is built in Phase 2. The data structure is ready to migrate to the API.

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookMarked,
  Plus,
  Trash2,
  ShoppingCart,
  X,
  Package,
  Edit3,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore, useCartStore } from '@/lib/store'
import { formatLKRShort } from '@/lib/utils'
import type { UnitType } from '@/types'

interface SavedListItem {
  variantId: string
  productId: string
  productName: string
  brandName: string
  slug: string
  imageUrl: string | null
  unitType: UnitType
  qty: number
  unitPrice: number
  unitLabel: string
  unitsPerPack: number
}

interface SavedList {
  id: string
  name: string
  items: SavedListItem[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'healplace-saved-lists'

function loadLists(): SavedList[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveLists(lists: SavedList[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
}

export default function SavedListsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)

  const [lists, setLists] = useState<SavedList[]>([])
  const [activeList, setActiveList] = useState<SavedList | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    if (!user || !token) {
      router.push('/login?next=/account/saved-lists')
      return
    }
    const loaded = loadLists()
    setLists(loaded)
    if (loaded.length > 0) setActiveList(loaded[0])
  }, [user, token, router])

  const updateLists = useCallback((updated: SavedList[]) => {
    setLists(updated)
    saveLists(updated)
  }, [])

  function createList() {
    if (!newListName.trim()) return
    const newList: SavedList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [...lists, newList]
    updateLists(updated)
    setActiveList(newList)
    setNewListName('')
    setCreatingNew(false)
    toast.success(`"${newList.name}" created!`)
  }

  function deleteList(listId: string) {
    if (!confirm('Delete this saved list?')) return
    const updated = lists.filter((l) => l.id !== listId)
    updateLists(updated)
    setActiveList(updated[0] ?? null)
    toast.success('List deleted')
  }

  function renameList(listId: string, name: string) {
    const updated = lists.map((l) =>
      l.id === listId ? { ...l, name, updatedAt: new Date().toISOString() } : l,
    )
    updateLists(updated)
    const newActive = updated.find((l) => l.id === listId) ?? null
    setActiveList(newActive)
    setEditingId(null)
  }

  function removeItemFromList(listId: string, variantId: string, unitType: UnitType) {
    const updated = lists.map((l) => {
      if (l.id !== listId) return l
      return {
        ...l,
        items: l.items.filter((i) => !(i.variantId === variantId && i.unitType === unitType)),
        updatedAt: new Date().toISOString(),
      }
    })
    updateLists(updated)
    const newActive = updated.find((l) => l.id === listId) ?? null
    setActiveList(newActive)
  }

  function orderAll(list: SavedList) {
    if (list.items.length === 0) {
      toast.error('This list is empty')
      return
    }
    list.items.forEach((item) => {
      addItem({
        variantId: item.variantId,
        productId: item.productId,
        productName: item.productName,
        brandName: item.brandName,
        slug: item.slug,
        imageUrl: item.imageUrl,
        unitType: item.unitType,
        qty: item.qty,
        unitPrice: item.unitPrice,
        unitLabel: item.unitLabel,
        unitsPerPack: item.unitsPerPack,
      })
    })
    toast.success(`${list.items.length} item${list.items.length !== 1 ? 's' : ''} added to cart!`, { icon: '🛒' })
    router.push('/cart')
  }

  const listTotal = (list: SavedList) =>
    list.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)

  if (!user) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Saved Lists</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Stored locally on this device — cloud sync coming in Phase 2
          </p>
        </div>
        <button
          onClick={() => setCreatingNew(true)}
          className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New List
        </button>
      </div>

      {/* New list form */}
      {creatingNew && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex gap-3">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createList()}
            placeholder="e.g. Weekly stock order"
            autoFocus
            className="flex-1 h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={createList}
            className="px-4 h-10 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => { setCreatingNew(false); setNewListName('') }}
            className="p-2 h-10 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {lists.length === 0 && !creatingNew ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookMarked className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No saved lists yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Create a list like "Weekly stock order" and reorder in one tap.
          </p>
          <button
            onClick={() => setCreatingNew(true)}
            className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create your first list
          </button>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          {/* List selector */}
          <div className="lg:col-span-1 mb-4 lg:mb-0">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Lists</p>
              </div>
              <div className="divide-y divide-gray-50">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className={`flex items-center gap-2 px-3 py-3 cursor-pointer transition-colors ${
                      activeList?.id === list.id ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveList(list)}
                  >
                    {editingId === list.id ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && renameList(list.id, editingName)}
                          autoFocus
                          className="flex-1 h-8 px-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                        <button
                          onClick={() => renameList(list.id, editingName)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <BookMarked className={`w-4 h-4 flex-shrink-0 ${activeList?.id === list.id ? 'text-green-600' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${activeList?.id === list.id ? 'text-green-700' : 'text-gray-700'}`}>
                            {list.name}
                          </p>
                          <p className="text-xs text-gray-400">{list.items.length} items</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setEditingId(list.id); setEditingName(list.name) }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteList(list.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active list detail */}
          <div className="lg:col-span-2">
            {activeList ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div>
                    <h2 className="font-bold text-gray-900">{activeList.name}</h2>
                    <p className="text-xs text-gray-500">
                      {activeList.items.length} items ·{' '}
                      {activeList.items.length > 0 ? formatLKRShort(listTotal(activeList)) : 'empty'}
                    </p>
                  </div>
                  <button
                    onClick={() => orderAll(activeList)}
                    disabled={activeList.items.length === 0}
                    className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Order All
                  </button>
                </div>

                {activeList.items.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No items in this list</p>
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline mt-2 font-medium"
                    >
                      Browse products to add
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {activeList.items.map((item) => (
                      <div
                        key={`${item.variantId}-${item.unitType}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">
                          📦
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${item.slug}`} className="hover:text-green-600">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                          </Link>
                          <p className="text-xs text-gray-500">
                            {item.qty} × {item.unitLabel} · {formatLKRShort(item.unitPrice * item.qty)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItemFromList(activeList.id, item.variantId, item.unitType)}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
