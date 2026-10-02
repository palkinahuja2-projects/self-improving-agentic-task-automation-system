import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    const rawUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
    const targetBase = rawUrl.endsWith("/api/v1") ? rawUrl : `${rawUrl}/api/v1`;
    return [
      {
        source: "/api/v1/:path*",
        destination: `${targetBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
