import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Force full recompile
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
