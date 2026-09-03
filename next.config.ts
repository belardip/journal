import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['shared-kit'],
  experimental: { externalDir: true },
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
