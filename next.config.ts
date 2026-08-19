import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The home directory above this project happens to be a git repository, which
  // makes Turbopack's workspace-root inference reach outside the app.
  turbopack: { root: path.resolve(".") },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
