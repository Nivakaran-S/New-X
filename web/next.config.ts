import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle — keeps the deployed footprint small on the Pi.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Product images already come from Cloudflare R2/CDN. Re-optimising them on
    // the Pi would run libvips per request, which is the single biggest source of
    // per-request memory and CPU on this hardware.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "uploads.wonderland.lk" }],
  },
  experimental: {
    // Next preloads every page's modules at server start. Disabling that trades a
    // little first-hit latency for a much smaller resident footprint.
    preloadEntriesOnStart: false,
  },
};

export default nextConfig;
