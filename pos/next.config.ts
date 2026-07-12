import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every POS route is a client component with no dynamic segments, so the app
  // exports to plain static files. Caddy serves `out/` directly, which removes a
  // whole Node process from the Pi.
  output: "export",
  images: {
    // Required for static export (no server to optimise images).
    unoptimized: true,
  },
};

export default nextConfig;
