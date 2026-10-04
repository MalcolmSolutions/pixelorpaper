import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SortSelect } from "@/components/products/sort-select";
import { getCategories } from "@/lib/categories";
import { getProducts } from "@/lib/products";
import type { ProductSort } from "@/types/product";

// Divisible by 2, 3 and 4 so every grid breakpoint ends on a full row.
const PAGE_SIZE = 24;

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "name", label: "Name, A–Z" },
];

type Filters = {
  category?: string;
  sort: ProductSort;
  page: number;
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseFilters(
  params: Record<string, string | string[] | undefined>,
  categorySlugs: string[],
): Filters {
  const category = one(params.category);
  const sort = one(params.sort);
  const page = Number.parseInt(one(params.page) ?? "", 10);

  return {
    category:
      category && categorySlugs.includes(category) ? category : undefined,
    sort: SORTS.find((s) => s.value === sort)?.value ?? "featured",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** URL for the listing with some filters changed. Resets to page 1. */
function hrefWith(filters: Filters, change: Partial<Filters>) {
  const next = { ...filters, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.category) params.set("category", next.category);
  if (next.sort !== "featured") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

export async function generateMetadata(
  props: PageProps<"/products">,
): Promise<Metadata> {
  const categories = await getCategories();
  const { category } = parseFilters(
    await props.searchParams,
    categories.map((c) => c.slug),
  );
  const active = categories.find((c) => c.slug === category);
  return {
    title: active ? `${active.name} prints` : "Prints",
    description: active?.description,
  };
}

export default async function ProductsPage(props: PageProps<"/products">) {
  const categories = await getCategories();
  const filters = parseFilters(
    await props.searchParams,
    categories.map((c) => c.slug),
  );
  const active = categories.find((c) => c.slug === filters.category);
  const products = await getProducts(filters);
  const visible = products.slice(0, filters.page * PAGE_SIZE);

  return (
    <div className="container-page section">
      <header className="mb-8 max-w-prose space-y-3 md:mb-10">
        <p className="eyebrow">{active ? "Category" : "Shop"}</p>
        <h1>{active?.name ?? "All prints"}</h1>
        <p className="text-ink-muted">
          {active?.description ??
            "Photographic prints from our travels, printed to order."}
        </p>
      </header>

      <nav
        aria-label="Categories"
        className="snap-row gap-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        <FilterChip
          href={hrefWith(filters, { category: undefined })}
          current={!active}
        >
          All
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c.slug}
            href={hrefWith(filters, { category: c.slug })}
            current={active?.slug === c.slug}
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
          value={filters.sort}
          options={SORTS.map((s) => ({
            ...s,
            href: hrefWith(filters, { sort: s.value }),
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
          <p className="text-ink-muted">No prints match these filters.</p>
          <Link href="/products" className="link text-sm">
            Clear filters
          </Link>
        </div>
      )}

      {visible.length < products.length && (
        <div className="mt-section flex flex-col items-center gap-4">
          <p className="text-sm text-ink-muted tabular-nums">
            Showing {visible.length} of {products.length}
          </p>
          <Link
            href={hrefWith(filters, { page: filters.page + 1 })}
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
