import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pino` and `pino-pretty` use worker-thread transports and native-ish module
  // resolution that Next.js should not attempt to bundle. Marking them external
  // keeps the structured logger (src/lib/logger.ts) working in both dev and
  // production builds. See docs/18_Coding_Standards.md §9.
  serverExternalPackages: ["pino", "pino-pretty"],
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
