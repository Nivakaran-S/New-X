import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { apiGet } from '@/lib/api'
import type { ApiResponse, ProductWithDetails } from '@healplace/types'
import { ProductDetailClient } from './ProductDetailClient'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string): Promise<ProductWithDetails | null> {
  try {
    const res = await apiGet<ApiResponse<ProductWithDetails>>(`/products/${slug}`)
    return res.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Product not found' }

  return {
    title: product.name,
    description: product.description ?? `Buy ${product.name} from HealPlace. Fast delivery across Colombo.`,
    openGraph: {
      title: product.name,
      description: product.description ?? '',
      images: product.images[0] ? [{ url: product.images[0].url }] : [],
    },
  }
}

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) notFound()

  return <ProductDetailClient product={product} />
}
