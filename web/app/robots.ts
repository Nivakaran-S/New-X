import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://healplace.lk'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/account/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
