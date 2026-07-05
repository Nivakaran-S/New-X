import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@healplace/ui', '@healplace/types'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'uploads.healplace.lk' }],
  },
}

export default config
