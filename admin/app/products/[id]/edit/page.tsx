'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiGet, apiPatch } from '@/lib/api'
import { ProductForm } from '@/components/products/ProductForm'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ProductWithDetails } from '@/types'

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const router = useRouter()
  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!token || !id) return
    try {
      const data = await apiGet<ProductWithDetails>(`/products/${id}`, token)
      setProduct(data)
    } catch {
      toast.error('Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(data: Parameters<typeof apiPatch>[1]) {
    if (!token || !id) return
    setSaving(true)
    try {
      await apiPatch(`/products/${id}`, data, token)
      toast.success('Product updated successfully')
      router.push('/products')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Product not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-brand-600 text-sm hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const initialData = {
    name: product.name,
    sku: product.sku ?? '',
    barcode: (product as { barcode?: string }).barcode ?? '',
    description: product.description ?? '',
    brandId: product.brandId ?? '',
    categoryId: product.categoryId ?? '',
    variants: product.variants?.map((v) => ({
      name: v.name,
      sku: v.sku ?? '',
      barcode: (v as { barcode?: string }).barcode ?? '',
      costPrice: String(v.costPrice ?? ''),
      retailPrice: String(v.retailPrice ?? ''),
      wholesalePrice: String(v.wholesalePrice ?? ''),
      lengthCm: String((v as { lengthCm?: number }).lengthCm ?? ''),
      widthCm: String((v as { widthCm?: number }).widthCm ?? ''),
      heightCm: String((v as { heightCm?: number }).heightCm ?? ''),
      weightGrams: String((v as { weightGrams?: number }).weightGrams ?? ''),
      unitsPerCase: String((v as { unitsPerCase?: number }).unitsPerCase ?? 1),
    })) ?? [],
    pricingRules: product.pricingRules?.map((r) => ({
      unitType: r.unitType,
      minQty: String(r.minQty),
      price: String(r.price),
      label: (r as { label?: string }).label ?? '',
    })) ?? [],
    imageUrls: product.images?.map((img) => img.url) ?? [],
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-500 text-sm font-mono">{product.sku ?? product.id}</p>
        </div>
      </div>

      <ProductForm initialData={initialData} productId={id} onSave={handleSave} saving={saving} />
    </div>
  )
}
