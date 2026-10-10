import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SortSelect } from "@/components/products/sort-select";
import { getCategories } from "@/lib/categories";
import { getProducts } from "@/lib/products";
import { collectionPath } from "@/lib/seo";
import type { Category } from "@/types/category";
import type { ProductSort } from "@/types/product";

// Divisible by 2, 3 and 4 so every grid breakpoint ends on a full row.
const PAGE_SIZE = 24;

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "name", label: "Name, A–Z" },
];

export type ListingOptions = {
  sort: ProductSort;
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

export function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

/** Sort and page from the query string, with safe defaults. */
export function parseListingOptions(params: SearchParams): ListingOptions {
  const sort = one(params.sort);
  const page = Number.parseInt(one(params.page) ?? "", 10);
  return {
    sort: SORTS.find((s) => s.value === sort)?.value ?? "featured",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** Query string for sort and page, leaving out the defaults. */
export function listingQuery({ sort, page }: ListingOptions) {
  const params = new URLSearchParams();
  if (sort !== "featured") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * The shop grid with category chips, sort and "Show more", for all prints
 * (`/products`) or one collection (`/collections/<slug>`).
 */
export async function ProductListing({
  category,
  options,
}: {
  category?: Category;
  options: ListingOptions;
}) {
  const categories = await getCategories();
  const products = await getProducts({
    category: category?.slug,
    sort: options.sort,
  });
  const visible = products.slice(0, options.page * PAGE_SIZE);
  const basePath = category ? collectionPath(category.slug) : "/products";
  // Changing sort starts again at page 1.
  const hrefWith = (change: Partial<ListingOptions>) =>
    basePath + listingQuery({ ...options, page: 1, ...change });

  return (
    <div className="container-page section">
      <header className="mb-8 max-w-prose space-y-3 md:mb-10">
        <p className="eyebrow">{category ? "Photographic prints" : "Shop"}</p>
        <h1>{category?.name ?? "All prints"}</h1>
        {(
          category?.description ||
          "Photographic prints from our travels, printed to order."
        )
          .split(/\n\s*\n/)
          .map((paragraph, i) => (
            <p key={i} className="text-ink-muted">
              {paragraph}
            </p>
          ))}
      </header>

      <nav
        aria-label="Collections"
        className="snap-row gap-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        <FilterChip href="/products" current={!category}>
          All
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c.slug}
            href={collectionPath(c.slug)}
            current={category?.slug === c.slug}
          >
            {c.name}
          </FilterChip>
        ))}
      </nav>

      <div className="mt-6 mb-8 flex items-center justify-between gap-6 border-b pb-3 md:mb-10">
        <p className="text-sm text-ink-muted tabular-nums">
          {products.length} {products.length === 1 ? "print" : "prints"}
        </p>

        <SortSelect
          value={options.sort}
          options={SORTS.map((s) => ({
            ...s,
            href: hrefWith({ sort: s.value }),
          }))}
        />
      </div>

      {visible.length > 0 ? (
        <div className="product-grid">
          {visible.map((product, i) => (
            <ProductCard key={product.id} product={product} eager={i < 4} />
          ))}
        </div>
      ) : (
        <div className="space-y-4 py-16 text-center">
          <p className="text-ink-muted">No prints here yet.</p>
          <Link href="/products" className="link text-sm">
            Browse all prints
          </Link>
        </div>
      )}

      {visible.length < products.length && (
        <div className="mt-section flex flex-col items-center gap-4">
          <p className="text-sm text-ink-muted tabular-nums">
            Showing {visible.length} of {products.length}
          </p>
          <Link
            href={hrefWith({ sort: options.sort, page: options.page + 1 })}
            scroll={false}
            className="btn btn-outline"
          >
            Show more
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "page" : undefined}
      className="chip whitespace-nowrap"
    >
      {children}
    </Link>
  );
}
