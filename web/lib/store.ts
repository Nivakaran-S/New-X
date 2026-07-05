'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UnitType } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────

export interface CartLineItem {
  variantId: string
  productId: string
  productName: string
  brandName: string
  slug: string
  imageUrl: string | null
  unitType: UnitType
  qty: number
  unitPrice: number   // price per chosen unitType
  unitLabel: string   // "Unit" | "Dozen" | "Case"
  unitsPerPack: number // 1 | 12 | case-qty — for nudge calculations
}

interface SafeUser {
  id: string
  name: string | null
  email: string
  phone: string | null
  accountType: 'RETAIL' | 'WHOLESALE'
  loyaltyPoints: number
}

// ─── Auth Store ───────────────────────────────────────────────────────

interface AuthState {
  token: string | null
  user: SafeUser | null
  login: (token: string, user: SafeUser) => void
  logout: () => void
  isWholesale: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isWholesale: () => get().user?.accountType === 'WHOLESALE',
    }),
    {
      name: 'healplace-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// ─── Cart Store ───────────────────────────────────────────────────────

interface CartState {
  items: CartLineItem[]
  addItem: (item: CartLineItem) => void
  removeItem: (variantId: string, unitType: UnitType) => void
  updateQty: (variantId: string, unitType: UnitType, qty: number) => void
  clearCart: () => void
  itemCount: () => number
  subtotal: () => number
  total: (deliveryFee?: number) => number
}

function lineKey(variantId: string, unitType: UnitType) {
  return `${variantId}::${unitType}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (incoming) => {
        set((state) => {
          const key = lineKey(incoming.variantId, incoming.unitType)
          const exists = state.items.find(
            (i) => lineKey(i.variantId, i.unitType) === key,
          )
          if (exists) {
            return {
              items: state.items.map((i) =>
                lineKey(i.variantId, i.unitType) === key
                  ? { ...i, qty: i.qty + incoming.qty }
                  : i,
              ),
            }
          }
          return { items: [...state.items, incoming] }
        })
      },

      removeItem: (variantId, unitType) => {
        set((state) => ({
          items: state.items.filter(
            (i) => lineKey(i.variantId, i.unitType) !== lineKey(variantId, unitType),
          ),
        }))
      },

      updateQty: (variantId, unitType, qty) => {
        if (qty <= 0) {
          get().removeItem(variantId, unitType)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            lineKey(i.variantId, i.unitType) === lineKey(variantId, unitType)
              ? { ...i, qty }
              : i,
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.qty, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),

      total: (deliveryFee = 0) => get().subtotal() + deliveryFee,
    }),
    {
      name: 'healplace-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
