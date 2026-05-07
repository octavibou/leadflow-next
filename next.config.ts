import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js + inline snippets (gtag) — keep as permissive as needed.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-src https://www.youtube.com https://player.vimeo.com https://www.loom.com https://fast.wistia.net",
      "base-uri 'self'",
      // We intentionally do NOT set frame-ancestors here because funnels may be embedded.
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
