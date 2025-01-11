import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      // 任意
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
