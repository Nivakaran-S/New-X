import { Suspense } from 'react'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { ProductCard } from '@/components/products/ProductCard'
import type { ProductCardData } from '@/components/products/ProductCard'
import { ProductFilters } from '@/components/products/ProductFilters'
import { apiGet } from '@/lib/api'
import type { ApiResponse } from '@healplace/types'

interface SearchParams {
  search?: string
  category?: string
  brand?: string
  minPrice?: string
  maxPrice?: string
  inStock?: string
  featured?: string
  page?: string
}

interface ProductsPageProps {
  searchParams: Promise<SearchParams>
}

async function getProducts(params: SearchParams): Promise<{
  products: ProductCardData[]
  total: number
}> {
  try {
    const qs = new URLSearchParams()
    if (params.search) qs.set('search', params.search)
    if (params.category) qs.set('category', params.category)
    if (params.brand) qs.set('brand', params.brand)
    if (params.minPrice) qs.set('minPrice', params.minPrice)
    if (params.maxPrice) qs.set('maxPrice', params.maxPrice)
    if (params.inStock) qs.set('inStock', params.inStock)
    if (params.featured) qs.set('featured', params.featured)
    qs.set('page', params.page ?? '1')
    qs.set('limit', '24')

    const res = await apiGet<ApiResponse<ProductCardData[]>>(`/products?${qs.toString()}`)
    return { products: res.data ?? [], total: res.meta?.total ?? 0 }
  } catch {
    return { products: [], total: 0 }
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  'cleaning-hygiene': 'Cleaning & Hygiene',
  'personal-care': 'Personal Care',
  'household': 'Household',
  'food-beverages': 'Food & Beverages',
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const { products, total } = await getProducts(params)

  const categoryLabel = params.category ? CATEGORY_LABELS[params.category] : null
  const pageTitle = params.search
    ? `Results for "${params.search}"`
    : categoryLabel ?? 'All Products'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span>/</span>
        <span className="text-gray-900">{pageTitle}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters — hidden on mobile (slide-in) */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20">
            <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded-xl" />}>
              <ProductFilters currentParams={params} />
            </Suspense>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
              {total > 0 && (
                <p className="text-sm text-gray-500">{total} products</p>
              )}
            </div>

            {/* Mobile filter button */}
            <button className="lg:hidden flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 touch-target">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Product grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <div className="text-5xl mb-4">📦</div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">No products found</h2>
              <p className="text-gray-500 text-sm mb-6">
                Try adjusting your search or filters.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-700 transition-colors"
              >
                View all products
              </Link>
            </div>
          )}

          {/* Pagination placeholder */}
          {total > 24 && (
            <div className="mt-8 flex justify-center gap-2">
              <Link
                href={`/products?${new URLSearchParams({ ...params, page: String(Math.max(1, Number(params.page ?? 1) - 1)) })}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </Link>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {params.page ?? 1} of {Math.ceil(total / 24)}
              </span>
              <Link
                href={`/products?${new URLSearchParams({ ...params, page: String(Number(params.page ?? 1) + 1) })}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Next
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
