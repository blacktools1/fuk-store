import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow all domains for development; restrict in production
    remotePatterns: [],
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
