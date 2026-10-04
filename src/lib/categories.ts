import { getCatalog } from "@/lib/catalog";
import type { Category } from "@/types/category";

export async function getCategories(): Promise<Category[]> {
  const { categories } = await getCatalog();
  return categories;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  const { categories } = await getCatalog();
  return categories.find((c) => c.slug === slug);
}
