import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { hostname: '*.mzstatic.com' },
      { hostname: 'coverartarchive.org' },
      { hostname: '*.coverartarchive.org' },
    ],
  },
};

export default nextConfig;
