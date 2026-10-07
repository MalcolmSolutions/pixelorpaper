import { asc, count, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDrizzle } from "@/db";
import {
  categories,
  productPrices,
  products,
  type CategoryRow,
  type ProductRow,
} from "@/db/schema";
import {
  orientationOf,
  readBucketCatalog,
  type Catalog,
} from "@/lib/catalog-import";
import { standardPrices } from "@/lib/print-sizes";
import { publicUrl } from "@/lib/r2";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

// The shop's catalog, read from D1 (products, product_prices, categories).
// Until an admin has imported the bucket into D1, it falls back to reading
// the bucket directly, so the shop is never empty. Pages should use
// lib/products.ts and lib/categories.ts rather than importing this module.
//
// Admin writes call updateTag(CATALOG_TAG) so changes show immediately.

export const CATALOG_TAG = "catalog";

/** Product as the shop sees it, built from its row and prices. */
export function toProduct(
  row: ProductRow,
  prices: Partial<Record<string, number>>,
): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.categorySlug,
    image: {
      src: publicUrl(row.imageKey),
      width: row.imageWidth,
      height: row.imageHeight,
      alt: row.description || row.name,
    },
    orientation: orientationOf(row.imageWidth, row.imageHeight),
    location: row.location ?? undefined,
    keywords: row.keywords,
    available: row.available,
    prices: { ...standardPrices(), ...prices },
  };
}

export function toCategory(row: CategoryRow, productCount: number): Category {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    wall: row.wall,
    count: productCount,
  };
}

async function readCatalog(): Promise<Catalog> {
  const db = await getDrizzle();
  const [{ total }] = await db.select({ total: count() }).from(products);
  if (total === 0) return readBucketCatalog();

  const [productRows, priceRows, categoryRows] = await Promise.all([
    db
      .select()
      .from(products)
      .orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(productPrices),
    db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);

  const pricesByProduct = new Map<string, Record<string, number>>();
  for (const p of priceRows) {
    const prices = pricesByProduct.get(p.productId) ?? {};
    prices[p.size] = p.pricePence;
    pricesByProduct.set(p.productId, prices);
  }
  const shopProducts = productRows.map((row) =>
    toProduct(row, pricesByProduct.get(row.id) ?? {}),
  );

  const availableCounts = new Map<string, number>();
  for (const p of shopProducts) {
    if (p.available) {
      availableCounts.set(
        p.category,
        (availableCounts.get(p.category) ?? 0) + 1,
      );
    }
  }

  return {
    products: shopProducts,
    categories: categoryRows.map((row) =>
      toCategory(row, availableCounts.get(row.slug) ?? 0),
    ),
  };
}

const getCachedCatalog = unstable_cache(readCatalog, ["d1-catalog"], {
  revalidate: 3600,
  tags: [CATALOG_TAG],
});

/**
 * The full catalog, including unavailable products (filter with
 * `available`), cached for an hour and deduplicated per request.
 */
export const getCatalog = cache(() => getCachedCatalog());

/**
 * Whether a product can be bought right now, read fresh (not cached).
 * Before the first import, falls back to checking the image is in the bucket.
 */
export async function isProductAvailableNow(id: string): Promise<boolean> {
  const db = await getDrizzle();
  const [{ total }] = await db.select({ total: count() }).from(products);
  if (total === 0) {
    const { objectExists } = await import("@/lib/r2");
    return objectExists(id);
  }
  const [row] = await db
    .select({ available: products.available })
    .from(products)
    .where(eq(products.id, id));
  return row?.available ?? false;
}
