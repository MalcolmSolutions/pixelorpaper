import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Create, rename and describe the collections prints are grouped into."
      />
      <p className="border border-dashed p-8 text-sm text-ink-muted">
        Category management arrives with product management.
      </p>
    </>
  );
}
