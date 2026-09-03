import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: { externalDir: true },
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  images: {
    remotePatterns: [
      { hostname: '*.mzstatic.com' },
      { hostname: 'coverartarchive.org' },
      { hostname: '*.coverartarchive.org' },
      { hostname: 'm.media-amazon.com' },
    ],
  },
};

export default nextConfig;
