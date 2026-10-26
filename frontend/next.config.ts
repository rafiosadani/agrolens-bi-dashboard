import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN access (colleagues, mentor, mobile, etc.) during development
  allowedDevOrigins: [
    "192.168.2.69",
    "192.168.2.69:3001",
    "192.168.2.99",
    "192.168.2.99:3001",
    "192.168.0.105",
    "192.168.0.105:3001",
    "localhost:3001",
    "127.0.0.1:3001",
  ],
  async rewrites() {
    return [
      {
        source: "/api/py/:path*",
        destination: "http://127.0.0.1:8001/api/v1/:path*",
      },
    ];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: "..",
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
