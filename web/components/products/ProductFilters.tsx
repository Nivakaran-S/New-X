'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ProductFiltersProps {
  currentParams: {
    category?: string
    brand?: string
    minPrice?: string
    maxPrice?: string
    inStock?: string
    search?: string
  }
}

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Cleaning & Hygiene', value: 'cleaning-hygiene' },
  { label: 'Personal Care', value: 'personal-care' },
  { label: 'Household', value: 'household' },
  { label: 'Food & Beverages', value: 'food-beverages' },
]

const PRICE_RANGES = [
  { label: 'Any price', min: '', max: '' },
  { label: 'Under LKR 500', min: '', max: '500' },
  { label: 'LKR 500 – 2,000', min: '500', max: '2000' },
  { label: 'LKR 2,000 – 5,000', min: '2000', max: '5000' },
  { label: 'Over LKR 5,000', min: '5000', max: '' },
]

export function ProductFilters({ currentParams }: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()

  const updateFilter = useCallback(
    (updates: Record<string, string>) => {
      const next = { ...currentParams, ...updates }
      // Remove empty keys
      const qs = new URLSearchParams()
      Object.entries(next).forEach(([k, v]) => {
        if (v) qs.set(k, v)
      })
      router.push(`${pathname}?${qs.toString()}`)
    },
    [currentParams, router, pathname],
  )

  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
        <ul className="space-y-1">
          {CATEGORIES.map((cat) => (
            <li key={cat.value}>
              <button
                onClick={() => updateFilter({ category: cat.value, page: '1' })}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  (currentParams.category ?? '') === cat.value
                    ? 'bg-brand-600 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {cat.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Price range</h3>
        <ul className="space-y-1">
          {PRICE_RANGES.map((range) => {
            const isActive =
              currentParams.minPrice === range.min &&
              currentParams.maxPrice === range.max
            return (
              <li key={range.label}>
                <button
                  onClick={() =>
                    updateFilter({
                      minPrice: range.min,
                      maxPrice: range.max,
                      page: '1',
                    })
                  }
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  {range.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* In stock toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={currentParams.inStock === 'true'}
              onChange={(e) =>
                updateFilter({ inStock: e.target.checked ? 'true' : '', page: '1' })
              }
              className="sr-only"
            />
            <div
              className={cn(
                'w-10 h-6 rounded-full transition-colors',
                currentParams.inStock === 'true' ? 'bg-brand-600' : 'bg-gray-300',
              )}
            />
            <div
              className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                currentParams.inStock === 'true' ? 'left-5' : 'left-1',
              )}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">In stock only</span>
        </label>
      </div>

      {/* Reset */}
      {Object.values(currentParams).some(Boolean) && (
        <button
          onClick={() => router.push(pathname)}
          className="w-full text-sm text-brand-600 hover:underline text-center py-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
