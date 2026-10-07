import { notFound, redirect } from "next/navigation";
import { getCurrentCustomer, type Customer } from "@/lib/auth";

export type Admin = Customer & { role: "admin" };

/**
 * The signed-in admin. Signed out: redirects to sign-in. Signed in without
 * the admin role: "not found", so the admin area isn't revealed.
 *
 * Call it at the top of every admin layout and page, and as the first
 * statement of every exported admin server action. Server actions and pages
 * are public endpoints that can be requested directly, so hiding admin links
 * or relying on the layout alone is not enough (`npm run check:admin`
 * enforces this).
 */
export async function requireAdmin(): Promise<Admin> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/sign-in");
  if (customer.role !== "admin") notFound();
  return customer as Admin;
}
