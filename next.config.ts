import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true, // ⚠️ отключает ESLint при сборке
  },
};

export default nextConfig;
