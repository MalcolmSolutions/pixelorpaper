import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Shop images are web previews from the public previews bucket. The bucket
// with the full-resolution originals is deliberately not allowed here.
const imageBaseUrl = process.env.NEXT_PUBLIC_PREVIEW_BASE_URL?.replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  images: {
    // Product previews are served from the R2 previews bucket's public URL.
    remotePatterns: imageBaseUrl ? [new URL(`${imageBaseUrl}/**`)] : [],
    // Cache optimised versions for a month.
    minimumCacheTTL: 2678400,
  },
  // Staging runs on *.workers.dev; keep it out of search results so it never
  // competes with the live site.
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: ".*\\.workers\\.dev" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Admin product images (up to 20 MB, checked in the action) plus form overhead.
      bodySizeLimit: "21mb",
    },
  },
};

export default nextConfig;

// Gives `next dev` the Cloudflare bindings (the local D1 orders database).
initOpenNextCloudflareForDev();
