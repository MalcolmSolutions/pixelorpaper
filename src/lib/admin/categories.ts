import { and, asc, count, eq, max, notExists, sql } from "drizzle-orm";
import { getDrizzle } from "@/db";
import { categories, products } from "@/db/schema";
import { slugify } from "@/lib/catalog-import";
import type { CategoryFields } from "@/lib/admin/category-input";

// Admin reads and writes for categories. Callers must have called
// requireAdmin() first. Reads are not cached.

/** Categories in shop order, with how many products each holds. */
export async function listCategoriesWithCounts() {
  const db = await getDrizzle();
  return db
    .select({
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      wall: categories.wall,
      sortOrder: categories.sortOrder,
      productCount: count(products.id),
      availableCount: sql<number>`coalesce(sum(${products.available}), 0)`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categorySlug, categories.slug))
    .groupBy(categories.slug)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/**
 * Creates a category at the end of the list. Its slug comes from the name
 * and is fixed from then on. Returns null if that slug is already taken.
 */
export async function insertCategory(fields: CategoryFields) {
  const db = await getDrizzle();
  const slug = slugify(fields.name);
  if (!slug) return null;
  const [{ last }] = await db
    .select({ last: max(categories.sortOrder) })
    .from(categories);
  const inserted = await db
    .insert(categories)
    .values({ slug, ...fields, sortOrder: (last ?? -1) + 1 })
    .onConflictDoNothing()
    .returning({ slug: categories.slug });
  return inserted[0]?.slug ?? null;
}

/** Updates name, description and wall colour. False if it doesn't exist. */
export async function updateCategory(slug: string, fields: CategoryFields) {
  const db = await getDrizzle();
  const updated = await db
    .update(categories)
    .set(fields)
    .where(eq(categories.slug, slug))
    .returning({ slug: categories.slug });
  return updated.length > 0;
}

/**
 * Deletes a category only if no product uses it (checked in the same
 * statement, so a product added meanwhile can't be orphaned).
 */
export async function deleteEmptyCategory(slug: string) {
  const db = await getDrizzle();
  const deleted = await db
    .delete(categories)
    .where(
      and(
        eq(categories.slug, slug),
        notExists(
          db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.categorySlug, slug)),
        ),
      ),
    )
    .returning({ slug: categories.slug });
  return deleted.length > 0;
}

/**
 * Moves a category one place up or down in the shop's order, renumbering
 * all positions so they stay 0, 1, 2… Returns false at either end.
 */
export async function moveCategory(slug: string, direction: "up" | "down") {
  const db = await getDrizzle();
  const ordered = await db
    .select({ slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  const from = ordered.findIndex((c) => c.slug === slug);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= ordered.length) return false;

  const reordered = ordered.map((c) => c.slug);
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
  const updates = reordered.map((s, i) =>
    db.update(categories).set({ sortOrder: i }).where(eq(categories.slug, s)),
  );
  await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  return true;
}
