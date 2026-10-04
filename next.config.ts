import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
