import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/account/actions";
import { SubmitButton } from "@/components/cart/submit-button";
import {
  formatOrderDate,
  PAYMENT_STATUS_LABELS,
} from "@/components/checkout/order-summary";
import { getCurrentCustomer } from "@/lib/auth";
import { getOrdersForCustomer } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false },
};

// Columns shared by the header row and each order row on wider screens.
const COLUMNS = "md:grid-cols-[minmax(0,1.4fr)_1fr_1fr_7rem_5rem]";

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/sign-in");
  const orders = await getOrdersForCustomer(customer);

  return (
    <div className="container-page section">
      <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between md:pb-10">
        <div className="space-y-3">
          <p className="eyebrow">Your account</p>
          <h1>Your orders</h1>
          <p className="text-sm text-ink-muted">
            Signed in as <span className="text-ink">{customer.email}</span>
          </p>
        </div>
        <form action={signOut}>
          <SubmitButton
            className="btn btn-outline btn-sm"
            pendingLabel="Signing out…"
          >
            Sign out
          </SubmitButton>
        </form>
      </header>

      {orders.length === 0 ? (
        <div className="space-y-6 py-12">
          <p className="text-ink-muted">
            You haven&rsquo;t placed any orders with {customer.email} yet.
          </p>
          <Link href="/products" className="btn btn-outline">
            Shop prints
          </Link>
        </div>
      ) : (
        <>
          <div
            aria-hidden
            className={`eyebrow hidden gap-6 border-b py-3 md:grid ${COLUMNS}`}
          >
            <span>Order</span>
            <span>Date</span>
            <span>Payment</span>
            <span className="text-right">Total</span>
            <span />
          </div>
          <ul className="divide-y border-b">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.reference}`}
                  className={`group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-5 md:items-center ${COLUMNS}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium tabular-nums">
                      {order.reference}
                    </span>
                    <span className="block text-sm text-ink-muted">
                      {order.item_count}{" "}
                      {order.item_count === 1 ? "print" : "prints"}
                    </span>
                  </span>
                  <span className="text-right tabular-nums md:order-none md:text-left">
                    <span className="sr-only">Placed </span>
                    {formatOrderDate(order)}
                  </span>
                  <span className="text-sm text-ink-muted md:text-base md:text-ink">
                    <span className="sr-only">Payment: </span>
                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                    {order.status === "needs_review" && (
                      <span className="block text-sm text-ink-muted">
                        Under review
                      </span>
                    )}
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="sr-only">Total </span>
                    {formatPrice(order.total_pence)}
                  </span>
                  <span className="col-span-2 text-sm underline-offset-4 group-hover:underline md:col-span-1 md:text-right">
                    View
                    <span className="sr-only"> order {order.reference}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
