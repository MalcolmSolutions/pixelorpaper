import type { Metadata } from "next";
import Link from "next/link";
import { moveCategory } from "@/app/admin/categories/actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryForm } from "@/components/admin/category-form";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";
import { SubmitButton } from "@/components/cart/submit-button";
import { wallColour } from "@/components/room-mockup";
import { requireAdmin } from "@/lib/admin";
import { countProducts } from "@/lib/admin/catalog";
import { listCategoriesWithCounts } from "@/lib/admin/categories";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();

  if ((await countProducts()) === 0) {
    return (
      <>
        <AdminPageHeader
          title="Categories"
          description="Create, rename and order the collections prints are grouped into."
        />
        <p className="max-w-prose border border-dashed p-8 text-sm text-ink-muted">
          Categories are managed here once the catalog is in the database.{" "}
          <Link href="/admin/products" className="link text-ink">
            Import your prints
          </Link>{" "}
          first.
        </p>
      </>
    );
  }

  const categories = await listCategoriesWithCounts();

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Create, rename and order the collections prints are grouped into. The shop shows them in this order, and hides any without prints for sale."
      />

      <details className="group mb-10 border p-5 open:pb-6">
        <summary className="cursor-pointer list-none font-medium">
          <span className="group-open:hidden">+ New category</span>
          <span className="hidden group-open:inline">New category</span>
        </summary>
        <div className="mt-5">
          <CategoryForm
            mode="create"
            values={{ name: "", description: "", wall: "sand" }}
          />
        </div>
      </details>

      <ol className="divide-y border-y">
        {categories.map((category, i) => (
          <li key={category.slug} className="space-y-3 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-4">
                <span
                  aria-hidden
                  className="mt-1 size-8 shrink-0 rounded-sm border"
                  style={{ backgroundColor: wallColour(category.wall) }}
                />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    {category.name}{" "}
                    <span className="text-xs font-normal text-ink-muted">
                      /{category.slug}
                    </span>
                  </p>
                  <p className="text-sm text-ink-muted">
                    <Link
                      href={`/admin/products?category=${category.slug}`}
                      className="link"
                    >
                      {category.productCount}{" "}
                      {category.productCount === 1 ? "product" : "products"}
                    </Link>
                    {category.productCount > 0 &&
                      category.availableCount < category.productCount && (
                        <> · {category.availableCount} for sale</>
                      )}
                    {category.availableCount === 0 && (
                      <> · hidden in the shop</>
                    )}
                  </p>
                  {category.description && (
                    <p className="line-clamp-2 max-w-prose text-sm text-ink-muted">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:shrink-0">
                <MoveButton
                  slug={category.slug}
                  name={category.name}
                  direction="up"
                  disabled={i === 0}
                />
                <MoveButton
                  slug={category.slug}
                  name={category.name}
                  direction="down"
                  disabled={i === categories.length - 1}
                />
                {category.productCount === 0 ? (
                  <DeleteCategoryButton
                    slug={category.slug}
                    name={category.name}
                  />
                ) : (
                  <span className="text-xs text-ink-muted">
                    Delete when empty
                  </span>
                )}
              </div>
            </div>

            <details className="group">
              <summary className="link cursor-pointer list-none text-sm">
                <span className="group-open:hidden">Edit</span>
                <span className="hidden group-open:inline">Close</span>
                <span className="sr-only"> {category.name}</span>
              </summary>
              <div className="mt-4 border-l-2 pl-5">
                <CategoryForm
                  mode="edit"
                  slug={category.slug}
                  values={{
                    name: category.name,
                    description: category.description,
                    wall: category.wall,
                  }}
                />
              </div>
            </details>
          </li>
        ))}
      </ol>
    </>
  );
}

function MoveButton({
  slug,
  name,
  direction,
  disabled,
}: {
  slug: string;
  name: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  return (
    <form action={moveCategory}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="direction" value={direction} />
      <SubmitButton
        disabled={disabled}
        className="link text-sm disabled:no-underline disabled:opacity-40"
      >
        {direction === "up" ? "Move up" : "Move down"}
        <span className="sr-only"> {name}</span>
      </SubmitButton>
    </form>
  );
}
