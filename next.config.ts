import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Cloudflare R2 public bucket
        protocol: "https",
        hostname: "pub-a46837d1003444cf98bdf8c264351140.r2.dev",
      },
    ],
  },
};

export default nextConfig;
