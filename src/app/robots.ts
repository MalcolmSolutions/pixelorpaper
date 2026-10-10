import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Cloudflare adds its content-signal comments above these rules.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/cart", "/checkout", "/downloads"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
