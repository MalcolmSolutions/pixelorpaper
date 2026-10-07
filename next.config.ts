import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const imageBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    // Product photos are served from the R2 bucket's public URL.
    remotePatterns: imageBaseUrl ? [new URL(`${imageBaseUrl}/**`)] : [],
    // Source files are large originals; cache optimised versions for a month.
    minimumCacheTTL: 2678400,
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
