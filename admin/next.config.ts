import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle — keeps the deployed footprint small on the Pi.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Served from R2/CDN; optimising on the Pi would burn CPU and memory.
    unoptimized: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    // Smaller resident footprint at the cost of a little first-hit latency.
    preloadEntriesOnStart: false,
  },
};

export default nextConfig;
