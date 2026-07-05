'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { apiPost } from '@/lib/api'
import { Plus, Trash2, Loader2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface VariantInput {
  name: string
  sku: string
  barcode: string
  costPrice: string
  retailPrice: string
  wholesalePrice: string
  lengthCm: string
  widthCm: string
  heightCm: string
  weightGrams: string
  unitsPerCase: string
}

interface PricingRuleInput {
  unitType: string
  minQty: string
  price: string
  label: string
}

interface ProductFormData {
  name: string
  sku: string
  barcode: string
  description: string
  brandId: string
  categoryId: string
  variants: VariantInput[]
  pricingRules: PricingRuleInput[]
  imageUrls: string[]
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>
  productId?: string
  onSave: (data: ProductFormData) => Promise<void>
  saving?: boolean
}

const EMPTY_VARIANT: VariantInput = {
  name: 'Default',
  sku: '',
  barcode: '',
  costPrice: '',
  retailPrice: '',
  wholesalePrice: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  weightGrams: '',
  unitsPerCase: '1',
}

const EMPTY_RULE: PricingRuleInput = {
  unitType: 'UNIT',
  minQty: '1',
  price: '',
  label: '',
}

const UNIT_TYPES = ['UNIT', 'DOZEN', 'CASE', 'PALLET']

export function ProductForm({ initialData, onSave, saving }: ProductFormProps) {
  const { token, user } = useAuthStore()
  const canSeeCost = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER'

  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name ?? '',
    sku: initialData?.sku ?? '',
    barcode: initialData?.barcode ?? '',
    description: initialData?.description ?? '',
    brandId: initialData?.brandId ?? '',
    categoryId: initialData?.categoryId ?? '',
    variants: initialData?.variants ?? [{ ...EMPTY_VARIANT }],
    pricingRules: initialData?.pricingRules ?? [],
    imageUrls: initialData?.imageUrls ?? [],
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  function setField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateVariant(idx: number, patch: Partial<VariantInput>) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }))
  }

  function addVariant() {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, { ...EMPTY_VARIANT }] }))
  }

  function removeVariant(idx: number) {
    if (form.variants.length <= 1) return
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }))
  }

  function updateRule(idx: number, patch: Partial<PricingRuleInput>) {
    setForm((prev) => ({
      ...prev,
      pricingRules: prev.pricingRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }))
  }

  function addRule() {
    setForm((prev) => ({ ...prev, pricingRules: [...prev.pricingRules, { ...EMPTY_RULE }] }))
  }

  function removeRule(idx: number) {
    setForm((prev) => ({ ...prev, pricingRules: prev.pricingRules.filter((_, i) => i !== idx) }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!token || !e.target.files?.length) return
    setUploadingImage(true)
    try {
      const file = e.target.files[0]
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/storage/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd },
      )
      if (!res.ok) throw new Error('Upload failed')
      const json = await res.json()
      const url = json?.data?.url ?? json?.url
      if (url) setField('imageUrls', [...form.imageUrls, url])
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Product name is required')
      return
    }
    await onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">Basic Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Coca-Cola 330ml"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setField('sku', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. COKE-330"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setField('barcode', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="EAN-13 barcode"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand ID</label>
            <input
              type="text"
              value={form.brandId}
              onChange={(e) => setField('brandId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Brand UUID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category ID</label>
            <input
              type="text"
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Category UUID"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            placeholder="Product description..."
          />
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">Images</h2>
        <div className="flex flex-wrap gap-3">
          {form.imageUrls.map((url, i) => (
            <div key={i} className="relative">
              <Image
                src={url}
                alt={`Product image ${i + 1}`}
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setField('imageUrls', form.imageUrls.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
          <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 transition-colors">
            {uploadingImage ? (
              <Loader2 size={18} className="animate-spin text-gray-400" />
            ) : (
              <>
                <Upload size={18} className="text-gray-300" />
                <span className="text-xs text-gray-300 mt-1">Upload</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      {/* Variants */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
          >
            <Plus size={14} />
            Add Variant
          </button>
        </div>

        {form.variants.map((variant, idx) => (
          <div key={idx} className="border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Variant {idx + 1}</p>
              {form.variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(idx)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={variant.name}
                  onChange={(e) => updateVariant(idx, { name: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
                <input
                  type="text"
                  value={variant.sku}
                  onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Barcode</label>
                <input
                  type="text"
                  value={variant.barcode}
                  onChange={(e) => updateVariant(idx, { barcode: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {canSeeCost && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cost Price (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.costPrice}
                    onChange={(e) => updateVariant(idx, { costPrice: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Retail Price (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.retailPrice}
                  onChange={(e) => updateVariant(idx, { retailPrice: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Wholesale Price (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.wholesalePrice}
                  onChange={(e) => updateVariant(idx, { wholesalePrice: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Length (cm)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={variant.lengthCm}
                  onChange={(e) => updateVariant(idx, { lengthCm: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Width (cm)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={variant.widthCm}
                  onChange={(e) => updateVariant(idx, { widthCm: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Height (cm)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={variant.heightCm}
                  onChange={(e) => updateVariant(idx, { heightCm: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Weight (g)</label>
                <input
                  type="number"
                  min="0"
                  value={variant.weightGrams}
                  onChange={(e) => updateVariant(idx, { weightGrams: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Units per Case</label>
                <input
                  type="number"
                  min="1"
                  value={variant.unitsPerCase}
                  onChange={(e) => updateVariant(idx, { unitsPerCase: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Pricing Rules</h2>
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
          >
            <Plus size={14} />
            Add Rule
          </button>
        </div>

        {form.pricingRules.length === 0 ? (
          <p className="text-sm text-gray-400">No pricing rules. Click &quot;Add Rule&quot; to add tiered pricing.</p>
        ) : (
          <div className="space-y-2">
            {form.pricingRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <select
                  value={rule.unitType}
                  onChange={(e) => updateRule(idx, { unitType: e.target.value })}
                  className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {UNIT_TYPES.map((u) => <option key={u}>{u}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500">Min Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={rule.minQty}
                    onChange={(e) => updateRule(idx, { minQty: e.target.value })}
                    className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <label className="text-xs text-gray-500">Price (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rule.price}
                    onChange={(e) => updateRule(idx, { price: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <label className="text-xs text-gray-500">Label</label>
                  <input
                    type="text"
                    value={rule.label}
                    onChange={(e) => updateRule(idx, { label: e.target.value })}
                    placeholder="e.g. Dozen Price"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRule(idx)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 text-white font-semibold rounded-lg transition-colors"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Save Product
        </button>
      </div>
    </form>
  )
}
