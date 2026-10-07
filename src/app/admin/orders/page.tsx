import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Every order, with its payment and fulfilment status."
      />
      <p className="border border-dashed p-8 text-sm text-ink-muted">
        The order list is coming in a later step.
      </p>
    </>
  );
}
