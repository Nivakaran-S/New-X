import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@healplace/ui', '@healplace/types'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default nextConfig
