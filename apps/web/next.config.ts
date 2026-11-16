import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.34', '172.20.10.3'],
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  async headers() {
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/rive/:path*", headers: immutable },
      { source: "/mascot/:path*", headers: immutable },
    ];
  },
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  
};

export default nextConfig;
