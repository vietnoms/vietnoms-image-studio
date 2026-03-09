import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  // Allow server-side file operations
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
