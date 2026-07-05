'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Sidebar } from './Sidebar'

interface AdminShellProps {
  children: React.ReactNode
}

const PUBLIC_PATHS = ['/login']

export function AdminShell({ children }: AdminShellProps) {
  const { token, user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
    if (!token && !isPublic) {
      router.replace('/login')
    }
  }, [mounted, token, pathname, router])

  if (!mounted) return null

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (isPublic || !token || !user) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
