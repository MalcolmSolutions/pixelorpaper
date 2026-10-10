import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/categories";
import { getProducts } from "@/lib/products";
import { absoluteUrl, collectionPath } from "@/lib/seo";

// Built per request from the hour-long catalog cache, so new prints appear
// without a deploy.
export const dynamic = "force-dynamic";

const PAGES = [
  "/about",
  "/contact",
  "/refunds-returns",
  "/terms-of-service",
  "/privacy-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "weekly", priority: 0.9 },
    ...categories.map((c) => ({
      url: absoluteUrl(collectionPath(c.slug)),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      ...(p.updatedAt && { lastModified: p.updatedAt }),
      images: [p.image.src],
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...PAGES.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
