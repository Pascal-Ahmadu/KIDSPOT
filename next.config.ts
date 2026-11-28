import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    root: import.meta.dirname ?? process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // WebP is much smaller than JPEG and quick to make on a small server (AVIF is slower to encode).
    formats: ["image/webp"],
    // Uploaded photos get a new name when replaced, so resized copies can be kept for a year.
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
