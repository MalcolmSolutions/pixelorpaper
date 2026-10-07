"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_SECTIONS = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
] as const;

/**
 * Admin section tabs. Navigation only: access is checked on the server by
 * requireAdmin() in every admin layout, page and action.
 */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="snap-row gap-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      {ADMIN_SECTIONS.map((section) => {
        const current =
          pathname === section.href || pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? "page" : undefined}
            className="chip whitespace-nowrap"
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
