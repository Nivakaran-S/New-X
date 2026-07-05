import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SafeUser } from '@/types'

interface AuthStore {
  token: string | null
  user: SafeUser | null
  login: (token: string, user: SafeUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'healplace-admin-auth',
    },
  ),
)
