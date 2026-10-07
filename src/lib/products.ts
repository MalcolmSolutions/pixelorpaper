import { getCatalog, isProductAvailableNow } from "@/lib/catalog";
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

/** Products for sale, optionally filtered and sorted. */
export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const { products } = await getCatalog();
  const result = products.filter(
    (p) =>
      p.available &&
      (!query.category || p.category === query.category) &&
      (!query.orientation || p.orientation === query.orientation),
  );
  const sorter = SORTERS[query.sort ?? "featured"];
  return sorter ? result.toSorted(sorter) : result;
}

export async function getBestSellers(limit = 8): Promise<Product[]> {
  const { products } = await getCatalog();
  return products.filter((p) => p.available).slice(0, limit);
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

export async function getProductById(id: string): Promise<Product | undefined> {
  const { products } = await getCatalog();
  return products.find((p) => p.id === id);
}

/**
 * Whether a product is still for sale, bypassing the hour-long catalog
 * cache. Used to revalidate stock before checkout.
 */
export async function isProductStillAvailable(id: string): Promise<boolean> {
  return isProductAvailableNow(id);
}
