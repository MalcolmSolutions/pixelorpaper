import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AvailabilitySwitch } from "@/components/admin/availability-switch";
import { ImportButton } from "@/components/admin/import-button";
import { inputClass } from "@/components/admin/field";
import { PrintThumbnail } from "@/components/print-thumbnail";
import { requireAdmin } from "@/lib/admin";
import {
  ADMIN_PAGE_SIZE,
  countByAvailability,
  countProducts,
  listCategories,
  listProducts,
  type AvailabilityFilter,
} from "@/lib/admin/catalog";
import { toProduct } from "@/lib/catalog";
import { PRINT_SIZES } from "@/lib/print-sizes";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const COLUMNS = "md:grid-cols-[6rem_minmax(0,1fr)_9rem_10rem_11rem_3rem]";

const STOCK_FILTERS: { value: AvailabilityFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "available", label: "In stock" },
  { value: "unavailable", label: "Unavailable" },
];

export default async function AdminProductsPage(
  props: PageProps<"/admin/products">,
) {
  await requireAdmin();
  const params = await props.searchParams;
  const one = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const search = one(params.q).slice(0, 100);
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);

  if ((await countProducts()) === 0) {
    return (
      <>
        <AdminPageHeader
          title="Products"
          description="Add and edit prints, their category and their prices."
        />
        <div className="max-w-prose space-y-4 border border-dashed p-8">
          <h2 className="text-h3">Import your prints</h2>
          <p className="text-sm text-ink-muted">
            The catalog isn&rsquo;t in the database yet, so the shop is still
            reading prints straight from the image bucket. Import them to manage
            them here. Prices start at the standard price for each size, and
            nothing in the bucket is changed.
          </p>
          <ImportButton primary />
        </div>
      </>
    );
  }

  const categories = await listCategories();
  const category = categories.some((c) => c.slug === one(params.category))
    ? one(params.category)
    : "";
  const availability: AvailabilityFilter =
    one(params.stock) === "available" || one(params.stock) === "unavailable"
      ? (one(params.stock) as AvailabilityFilter)
      : "";
  const [{ total, rows }, stock] = await Promise.all([
    listProducts({ search, category, availability, page }),
    countByAvailability(category),
  ]);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
  const href = (change: Record<string, string | number>) => {
    const next = new URLSearchParams();
    const merged = {
      q: search,
      category,
      stock: availability,
      page: 1,
      ...change,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === "page" && v === 1)) next.set(k, String(v));
    }
    const query = next.toString();
    return query ? `/admin/products?${query}` : "/admin/products";
  };

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Add and edit prints, their category and their prices."
        actions={
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            New product
          </Link>
        }
      />

      <form
        action="/admin/products"
        className="mb-6 flex flex-col gap-3 sm:flex-row"
        role="search"
      >
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Search by name"
          className={`${inputClass} sm:max-w-sm`}
        />
        {category && <input type="hidden" name="category" value={category} />}
        {availability && (
          <input type="hidden" name="stock" value={availability} />
        )}
        <button type="submit" className="btn btn-outline">
          Search
        </button>
      </form>

      <nav
        aria-label="Filter by category"
        className="snap-row mb-6 gap-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        <Link
          href={href({ category: "" })}
          aria-current={!category ? "page" : undefined}
          className="chip whitespace-nowrap"
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={href({ category: c.slug })}
            aria-current={category === c.slug ? "page" : undefined}
            className="chip whitespace-nowrap"
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Filter by stock"
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        <span className="eyebrow mr-2">Stock</span>
        {STOCK_FILTERS.map((f) => (
          <Link
            key={f.label}
            href={href({ stock: f.value })}
            aria-current={availability === f.value ? "page" : undefined}
            className="chip gap-2 whitespace-nowrap"
          >
            {f.label}
            <span className="text-xs tabular-nums opacity-70">
              {f.value === ""
                ? stock.available + stock.unavailable
                : stock[f.value]}
            </span>
          </Link>
        ))}
      </nav>

      <p className="mb-3 text-sm text-ink-muted tabular-nums">
        {total} {total === 1 ? "product" : "products"}
        {search && <> matching &ldquo;{search}&rdquo;</>}
      </p>

      {rows.length === 0 ? (
        <p className="border-y py-10 text-ink-muted">
          No products match.{" "}
          <Link href="/admin/products" className="link">
            Clear filters
          </Link>
        </p>
      ) : (
        <>
          <div
            aria-hidden
            className={`eyebrow hidden gap-6 border-b py-3 md:grid ${COLUMNS}`}
          >
            <span />
            <span>Product</span>
            <span>Category</span>
            <span>Prices</span>
            <span>Stock</span>
            <span />
          </div>
          <ul className="divide-y border-b">
            {rows.map(({ row, prices }) => {
              const product = toProduct(row, prices);
              const amounts = PRINT_SIZES.map((s) => product.prices[s.name]);
              const custom = PRINT_SIZES.some(
                (s) => product.prices[s.name] !== s.standardPrice,
              );
              return (
                <li
                  key={row.id}
                  className={`grid grid-cols-[5rem_1fr] items-center gap-x-4 gap-y-1 py-4 md:gap-x-6 ${COLUMNS}`}
                >
                  <div className="row-span-5 self-start md:row-span-1 md:self-center">
                    <PrintThumbnail product={product} />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${row.slug}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">
                      {row.slug}
                    </p>
                  </div>
                  <p className="text-sm">
                    <span className="sr-only">Category: </span>
                    {categoryName.get(row.categorySlug) ?? row.categorySlug}
                  </p>
                  <p className="text-sm tabular-nums">
                    <span className="sr-only">Prices: </span>
                    {formatPrice(Math.min(...amounts))} –{" "}
                    {formatPrice(Math.max(...amounts))}
                    {custom && (
                      <span className="ml-2 text-xs text-ink-muted">
                        Custom
                      </span>
                    )}
                  </p>
                  <AvailabilitySwitch
                    slug={row.slug}
                    name={row.name}
                    available={row.available}
                    compact
                  />
                  <Link
                    href={`/admin/products/${row.slug}`}
                    className="link text-sm md:text-right"
                  >
                    Edit<span className="sr-only"> {row.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {pages > 1 && (
        <nav
          aria-label="Pages"
          className="mt-8 flex items-center justify-between gap-4 text-sm"
        >
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className="link">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-muted tabular-nums">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href({ page: page + 1 })} className="link">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <div className="mt-12 max-w-prose space-y-3 border-t pt-8">
        <h2 className="eyebrow">Add new prints from the bucket</h2>
        <p className="text-sm text-ink-muted">
          Copies any prints added to the image bucket since the last import.
          Products you&rsquo;ve edited here are left as they are.
        </p>
        <ImportButton />
      </div>
    </>
  );
}
