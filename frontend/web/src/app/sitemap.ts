import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://healplace.lk'

  // Fetch all active products
  let productUrls: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products?limit=500&status=ACTIVE`,
      { next: { revalidate: 3600 } },
    )
    const json = await res.json().catch(() => ({ data: [] }))
    const products: { slug: string; updatedAt: string }[] = json.data ?? []
    productUrls = products.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))
  } catch {
    // If API is unreachable at build time, continue with static routes only
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/wholesale`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...productUrls,
  ]
}
