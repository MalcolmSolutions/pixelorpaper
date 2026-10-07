import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { inputClass } from "@/components/admin/field";
import {
  formatDateTime,
  ORDER_STATUS_LABELS,
  orderTime,
} from "@/components/admin/order-labels";
import { PAYMENT_STATUS_LABELS } from "@/components/checkout/order-summary";
import { requireAdmin } from "@/lib/admin";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  countOrdersByFilter,
  isOrderFilter,
  listOrders,
  ORDER_FILTERS,
  type OrderFilter,
} from "@/lib/admin/orders";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const COLUMNS =
  "md:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.3fr)_8rem_8rem_6rem]";

export default async function AdminOrdersPage(
  props: PageProps<"/admin/orders">,
) {
  await requireAdmin();
  const params = await props.searchParams;
  const one = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const filter: OrderFilter = isOrderFilter(one(params.filter))
    ? (one(params.filter) as OrderFilter)
    : "all";
  const search = one(params.q).slice(0, 100);
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);

  const [{ total, rows }, counts] = await Promise.all([
    listOrders({ filter, search, page }),
    countOrdersByFilter(),
  ]);
  const pages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));
  const href = (change: Record<string, string | number>) => {
    const next = new URLSearchParams();
    const merged = { filter, q: search, page: 1, ...change };
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === "page" && v === 1) && !(k === "filter" && v === "all")) {
        next.set(k, String(v));
      }
    }
    const query = next.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  };

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Every order, newest first. Payment status comes only from Stripe."
      />

      <form
        action="/admin/orders"
        role="search"
        className="mb-6 flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <input
          id="order-search"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Reference, email or name"
          className={`${inputClass} sm:max-w-sm`}
        />
        {filter !== "all" && (
          <input type="hidden" name="filter" value={filter} />
        )}
        <button type="submit" className="btn btn-outline">
          Search
        </button>
      </form>

      <nav
        aria-label="Filter orders"
        className="snap-row mb-6 gap-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {(Object.keys(ORDER_FILTERS) as OrderFilter[]).map((key) => (
          <Link
            key={key}
            href={href({ filter: key })}
            aria-current={filter === key ? "page" : undefined}
            className="chip gap-2 whitespace-nowrap"
          >
            {ORDER_FILTERS[key].label}
            <span className="text-xs tabular-nums opacity-70">
              {counts[key]}
            </span>
          </Link>
        ))}
      </nav>

      <p className="mb-3 text-sm text-ink-muted tabular-nums">
        {total} {total === 1 ? "order" : "orders"}
        {search && <> matching &ldquo;{search}&rdquo;</>}
      </p>

      {rows.length === 0 ? (
        <p className="border-y py-10 text-ink-muted">
          No orders here.
          {(search || filter !== "all") && (
            <>
              {" "}
              <Link href="/admin/orders" className="link">
                Show all orders
              </Link>
            </>
          )}
        </p>
      ) : (
        <>
          <div
            aria-hidden
            className={`eyebrow hidden gap-6 border-b py-3 md:grid ${COLUMNS}`}
          >
            <span>Order</span>
            <span>Date</span>
            <span>Customer</span>
            <span>Payment</span>
            <span>Status</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y border-b">
            {rows.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.reference}`}
                  className={`group grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 py-4 md:items-center ${COLUMNS}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium tabular-nums underline-offset-4 group-hover:underline">
                      {order.reference}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {order.item_count}{" "}
                      {order.item_count === 1 ? "print" : "prints"}
                    </span>
                  </span>
                  <span className="text-right text-sm tabular-nums md:text-left">
                    <span className="sr-only">Date: </span>
                    {formatDateTime(orderTime(order))}
                  </span>
                  <span className="col-span-2 min-w-0 truncate text-sm md:col-span-1">
                    <span className="sr-only">Customer: </span>
                    {order.customer_email ?? (
                      <span className="text-ink-muted">Not provided</span>
                    )}
                  </span>
                  <span className="text-sm">
                    <span className="sr-only">Payment: </span>
                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                  </span>
                  <span className="text-right text-sm text-ink-muted md:text-left">
                    <span className="sr-only">Status: </span>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <span className="col-span-2 text-right tabular-nums md:col-span-1">
                    <span className="sr-only">Total: </span>
                    {formatPrice(order.total_pence)}
                  </span>
                </Link>
              </li>
            ))}
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
    </>
  );
}
