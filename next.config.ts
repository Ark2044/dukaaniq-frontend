import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  // The browser only talks to the Next.js origin; API calls are proxied to Spring Boot.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  // Next's proxy gives up after 30s by default. Real AI calls (voice, advisor) can take longer because the
  // model reasons before answering, and a cut-off shows up as a plain-text 500 the app cannot read.
  experimental: {
    proxyTimeout: 120_000,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
