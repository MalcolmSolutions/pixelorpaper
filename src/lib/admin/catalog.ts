import { and, asc, count, eq, like, min, or, type SQL } from "drizzle-orm";
import { getDrizzle } from "@/db";
import { categories, productPrices, products } from "@/db/schema";
import { readBucketCatalog, slugify } from "@/lib/catalog-import";
import { PRINT_SIZES } from "@/lib/print-sizes";
import type { ProductFields, UploadedImage } from "@/lib/admin/product-input";

// Admin reads and writes for the catalog. Callers (admin pages and server
// actions) must have called requireAdmin() first. Reads here are not cached,
// so admins always see the current data.

export const ADMIN_PAGE_SIZE = 40;

export async function countProducts() {
  const db = await getDrizzle();
  const [{ total }] = await db.select({ total: count() }).from(products);
  return total;
}

export async function listCategories() {
  const db = await getDrizzle();
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function categoryExists(slug: string) {
  const db = await getDrizzle();
  const [row] = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.slug, slug));
  return Boolean(row);
}

/** A page of products matching a name search and category, with prices. */
export async function listProducts({
  search = "",
  category = "",
  page = 1,
}: {
  search?: string;
  category?: string;
  page?: number;
}) {
  const db = await getDrizzle();
  const filters: SQL[] = [];
  if (search) {
    const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(
      or(like(products.name, pattern), like(products.slug, pattern))!,
    );
  }
  if (category) filters.push(eq(products.categorySlug, category));
  const where = filters.length ? and(...filters) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(where);
  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(asc(products.sortOrder), asc(products.name))
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE);
  const prices = rows.length
    ? await db
        .select()
        .from(productPrices)
        .where(or(...rows.map((r) => eq(productPrices.productId, r.id))))
    : [];

  return {
    total,
    rows: rows.map((row) => ({
      row,
      prices: Object.fromEntries(
        prices
          .filter((p) => p.productId === row.id)
          .map((p) => [p.size, p.pricePence]),
      ),
    })),
  };
}

export async function getProductBySlug(slug: string) {
  const db = await getDrizzle();
  const [row] = await db.select().from(products).where(eq(products.slug, slug));
  if (!row) return null;
  const prices = await db
    .select()
    .from(productPrices)
    .where(eq(productPrices.productId, row.id));
  return {
    row,
    prices: Object.fromEntries(prices.map((p) => [p.size, p.pricePence])),
  };
}

/** A URL slug for a new product, unique among existing ones. */
async function uniqueSlug(name: string) {
  const db = await getDrizzle();
  const base = slugify(name) || "print";
  const taken = new Set(
    (
      await db
        .select({ slug: products.slug })
        .from(products)
        .where(or(eq(products.slug, base), like(products.slug, `${base}-%`)))
    ).map((r) => r.slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

const priceRows = (productId: string, prices: ProductFields["prices"]) =>
  PRINT_SIZES.map((size) => ({
    productId,
    size: size.name,
    pricePence: prices[size.name],
  }));

/** Inserts a product whose image is already uploaded to `imageKey`. */
export async function insertProduct(
  fields: ProductFields,
  imageKey: string,
  image: Pick<UploadedImage, "width" | "height">,
) {
  const db = await getDrizzle();
  const slug = await uniqueSlug(fields.name);
  // New prints lead the default listing.
  const [{ first }] = await db
    .select({ first: min(products.sortOrder) })
    .from(products);

  await db.batch([
    db.insert(products).values({
      id: imageKey,
      slug,
      name: fields.name,
      description: fields.description,
      categorySlug: fields.categorySlug,
      imageKey,
      imageWidth: image.width,
      imageHeight: image.height,
      location: fields.location,
      keywords: fields.keywords,
      sortOrder: (first ?? 0) - 1,
    }),
    db.insert(productPrices).values(priceRows(imageKey, fields.prices)),
  ]);
  return slug;
}

/** Updates a product's details, category and prices in one transaction. */
export async function updateProduct(id: string, fields: ProductFields) {
  const db = await getDrizzle();
  await db.batch([
    db
      .update(products)
      .set({
        name: fields.name,
        description: fields.description,
        categorySlug: fields.categorySlug,
        location: fields.location,
        keywords: fields.keywords,
      })
      .where(eq(products.id, id)),
    ...priceRows(id, fields.prices).map((price) =>
      db
        .insert(productPrices)
        .values(price)
        .onConflictDoUpdate({
          target: [productPrices.productId, productPrices.size],
          set: { pricePence: price.pricePence },
        }),
    ),
  ]);
}

/**
 * Copies prints from the R2 bucket into D1. Safe to repeat: existing
 * categories and products (and their edited details) are left alone.
 */
export async function importFromBucket() {
  const db = await getDrizzle();
  const bucket = await readBucketCatalog();
  const before = await countProducts();

  const categoryInserts = bucket.categories.map((c, i) =>
    db
      .insert(categories)
      .values({
        slug: c.slug,
        name: c.name,
        description: c.description,
        wall: c.wall,
        sortOrder: i,
      })
      .onConflictDoNothing(),
  );
  const productInserts = bucket.products.flatMap((p, i) => [
    db
      .insert(products)
      .values({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        categorySlug: p.category,
        imageKey: p.id,
        imageWidth: p.image.width,
        imageHeight: p.image.height,
        location: p.location ?? null,
        keywords: p.keywords,
        sortOrder: i,
      })
      .onConflictDoNothing(),
    ...PRINT_SIZES.map((size) =>
      db
        .insert(productPrices)
        .values({
          productId: p.id,
          size: size.name,
          pricePence: p.prices[size.name],
        })
        .onConflictDoNothing(),
    ),
  ]);

  // Categories first (products reference them), then products in chunks so
  // no single D1 batch gets too large. Each chunk is one transaction.
  const statements = [...categoryInserts, ...productInserts];
  for (let i = 0; i < statements.length; i += 100) {
    const chunk = statements.slice(i, i + 100);
    await db.batch(chunk as [(typeof chunk)[number], ...typeof chunk]);
  }

  const after = await countProducts();
  return {
    imported: after - before,
    inBucket: bucket.products.length,
    categories: bucket.categories.length,
  };
}
