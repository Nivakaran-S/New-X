'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  SafeUser,
  PosLineItem,
  PaymentMethod,
  UnitType,
} from '@/types'
import type { ProductVariantWithProduct } from '@/components/pos/ProductSearchResult'

// ── Auth Store ─────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null
  user: SafeUser | null
  login: (token: string, user: SafeUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'wonderland-pos-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

// ── Transaction Store ──────────────────────────────────────────────────────

export interface TxItem extends PosLineItem {
  // PosLineItem already has variantId, variant, unitType, qty, unitPrice, totalPrice, discount
}

interface TransactionState {
  items: TxItem[]
  customer: SafeUser | null
  paymentMethod: PaymentMethod
  cashReceived: number
  referenceNo: string

  // Computed helpers
  subtotal: () => number
  total: () => number
  change: () => number

  // Actions
  addItem: (
    variant: ProductVariantWithProduct,
    unitType: UnitType,
    unitPrice: number,
  ) => void
  removeItem: (variantId: string, unitType: UnitType) => void
  updateQty: (variantId: string, unitType: UnitType, qty: number) => void
  setCustomer: (customer: SafeUser | null) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setCashReceived: (amount: number) => void
  setReferenceNo: (ref: string) => void
  clearTransaction: () => void
}

export const useTransactionStore = create<TransactionState>()((set, get) => ({
  items: [],
  customer: null,
  paymentMethod: 'CASH',
  cashReceived: 0,
  referenceNo: '',

  subtotal: () => {
    return get().items.reduce((sum, item) => sum + item.totalPrice, 0)
  },

  total: () => {
    const subtotal = get().subtotal()
    const discountTotal = get().items.reduce(
      (sum, item) => sum + item.discount,
      0,
    )
    return subtotal - discountTotal
  },

  change: () => {
    const total = get().total()
    const cash = get().cashReceived
    return Math.max(0, cash - total)
  },

  addItem: (variant: ProductVariantWithProduct, unitType, unitPrice) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.variantId === variant.id && i.unitType === unitType,
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === variant.id && i.unitType === unitType
              ? {
                  ...i,
                  qty: i.qty + 1,
                  totalPrice: (i.qty + 1) * i.unitPrice,
                }
              : i,
          ),
        }
      }
      const newItem: TxItem = {
        variantId: variant.id,
        variant,
        unitType,
        qty: 1,
        unitPrice,
        totalPrice: unitPrice,
        discount: 0,
      }
      return { items: [...state.items, newItem] }
    })
  },

  removeItem: (variantId, unitType) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.variantId === variantId && i.unitType === unitType),
      ),
    }))
  },

  updateQty: (variantId, unitType, qty) => {
    if (qty < 1) return
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId && i.unitType === unitType
          ? { ...i, qty, totalPrice: qty * i.unitPrice }
          : i,
      ),
    }))
  },

  setCustomer: (customer) => set({ customer }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setCashReceived: (amount) => set({ cashReceived: amount }),

  setReferenceNo: (ref) => set({ referenceNo: ref }),

  clearTransaction: () =>
    set({
      items: [],
      customer: null,
      paymentMethod: 'CASH',
      cashReceived: 0,
      referenceNo: '',
    }),
}))
