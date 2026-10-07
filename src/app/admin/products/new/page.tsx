import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin";
import { countProducts, listCategories } from "@/lib/admin/catalog";
import { standardPrices } from "@/lib/print-sizes";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  // Products can only be added once the catalog is in the database.
  if ((await countProducts()) === 0) redirect("/admin/products");
  const categories = await listCategories();

  return (
    <>
      <Link href="/admin/products" className="link text-sm">
        All products
      </Link>
      <div className="mt-6">
        <AdminPageHeader
          title="New product"
          description="Upload the print and set its details and prices. It goes on sale as soon as it's created."
        />
      </div>
      <ProductForm
        mode="create"
        categories={categories}
        values={{
          name: "",
          description: "",
          categorySlug: "",
          location: "",
          keywords: "",
          prices: standardPrices(),
        }}
      />
    </>
  );
}
