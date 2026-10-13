import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '10.65.25.8'],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: ['127.0.0.1:3008', '10.65.25.8:3008', 'localhost:3008'],
    },
  },
} as any;

export default nextConfig;
