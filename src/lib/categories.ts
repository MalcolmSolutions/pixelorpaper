import { getCatalog } from "@/lib/catalog";
import type { Category } from "@/types/category";

/** Categories with at least one print for sale. */
export async function getCategories(): Promise<Category[]> {
  const { categories } = await getCatalog();
  return categories.filter((c) => c.count > 0);
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  const { categories } = await getCatalog();
  return categories.find((c) => c.slug === slug);
}
