import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AvailabilitySwitch } from "@/components/admin/availability-switch";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin";
import { getProductBySlug, listCategories } from "@/lib/admin/catalog";
import { toProduct } from "@/lib/catalog";

export async function generateMetadata(
  props: PageProps<"/admin/products/[slug]">,
): Promise<Metadata> {
  await requireAdmin();
  const { slug } = await props.params;
  const found = await getProductBySlug(slug);
  return { title: found ? `Edit ${found.row.name}` : "Product not found" };
}

export default async function EditProductPage(
  props: PageProps<"/admin/products/[slug]">,
) {
  await requireAdmin();
  const [{ slug }, { created }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const found = await getProductBySlug(slug);
  if (!found) notFound();
  const categories = await listCategories();
  const product = toProduct(found.row, found.prices);

  return (
    <>
      <Link href="/admin/products" className="link text-sm">
        All products
      </Link>
      <div className="mt-6">
        <AdminPageHeader
          title={product.name}
          description={`Slug: ${product.slug}`}
          actions={
            <Link
              href={`/products/${product.slug}`}
              className="btn btn-outline btn-sm"
            >
              View in shop
            </Link>
          }
        />
      </div>
      {created === "1" && (
        <p role="status" className="mb-8 border-l-2 border-ink pl-4 text-sm">
          Product created and on sale in the shop.
        </p>
      )}
      <section
        aria-labelledby="sale-heading"
        className="mb-10 flex flex-col gap-3 border p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <h2 id="sale-heading" className="eyebrow">
            Sale status
          </h2>
          <p className="text-sm text-ink-muted">
            {product.available
              ? "Customers can find and buy this print."
              : "Off sale: hidden from the shop, and it can't be added to carts or bought."}
          </p>
        </div>
        <AvailabilitySwitch
          slug={product.slug}
          name={product.name}
          available={product.available}
        />
      </section>
      <ProductForm
        mode="edit"
        slug={product.slug}
        categories={categories}
        image={product.image}
        values={{
          name: product.name,
          description: product.description,
          categorySlug: product.category,
          location: product.location ?? "",
          keywords: product.keywords.join(", "),
          prices: product.prices,
        }}
      />
    </>
  );
}
