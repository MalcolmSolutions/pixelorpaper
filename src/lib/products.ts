import { getCatalog } from "@/lib/catalog";
import type { Orientation, Product, ProductSort } from "@/types/product";

export type ProductQuery = {
  category?: string;
  orientation?: Orientation;
  sort?: ProductSort;
};

const SORTERS: Record<ProductSort, ((a: Product, b: Product) => number) | null> = {
  featured: null,
  name: (a, b) => a.name.localeCompare(b.name),
};

/** Products from the R2 catalog, optionally filtered and sorted. */
export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const { products } = await getCatalog();
  const result = products.filter(
    (p) =>
      (!query.category || p.category === query.category) &&
      (!query.orientation || p.orientation === query.orientation),
  );
  const sorter = SORTERS[query.sort ?? "featured"];
  return sorter ? result.toSorted(sorter) : result;
}

export async function getBestSellers(limit = 8): Promise<Product[]> {
  const { products } = await getCatalog();
  return products.slice(0, limit);
}

export async function getProductsByCategory(
  category: string,
): Promise<Product[]> {
  return getProducts({ category });
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const { products } = await getCatalog();
  return products.find((p) => p.slug === slug);
}
