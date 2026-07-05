'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiPost } from '@/lib/api'
import { ProductForm } from '@/components/products/ProductForm'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewProductPage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleSave(data: Parameters<typeof apiPost>[1]) {
    if (!token) return
    setSaving(true)
    try {
      await apiPost('/products', data, token)
      toast.success('Product created successfully')
      router.push('/products')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
          <p className="text-gray-500 text-sm">Add a new product to the catalogue</p>
        </div>
      </div>

      <ProductForm onSave={handleSave} saving={saving} />
    </div>
  )
}
