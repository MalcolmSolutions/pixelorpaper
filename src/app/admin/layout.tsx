import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | Pixel or Paper" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <div className="container-page section">
      <header className="space-y-6 border-b pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="eyebrow">Admin</p>
          <p className="text-sm text-ink-muted">
            Signed in as <span className="text-ink">{admin.email}</span> ·{" "}
            <Link href="/account" className="link">
              Your account
            </Link>
          </p>
        </div>
        <AdminNav />
      </header>
      <div className="pt-8 md:pt-10">{children}</div>
    </div>
  );
}
