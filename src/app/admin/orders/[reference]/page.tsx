import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  formatDateTime,
  ORDER_STATUS_LABELS,
  orderTime,
} from "@/components/admin/order-labels";
import { OrderProgress } from "@/components/checkout/order-progress";
import {
  OrderDetails,
  OrderItems,
  PAYMENT_STATUS_LABELS,
} from "@/components/checkout/order-summary";
import { requireAdmin } from "@/lib/admin";
import { getOrderForAdmin } from "@/lib/admin/orders";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata(
  props: PageProps<"/admin/orders/[reference]">,
): Promise<Metadata> {
  await requireAdmin();
  const { reference } = await props.params;
  return { title: `Order ${reference}` };
}

/** Read-only view of any order, with the Stripe details behind it. */
export default async function AdminOrderPage(
  props: PageProps<"/admin/orders/[reference]">,
) {
  await requireAdmin();
  const { reference } = await props.params;
  const found = await getOrderForAdmin(reference);
  if (!found) notFound();
  const { order, items, accountEmail } = found;

  const inProgress =
    ["placed", "needs_review", "fulfilled"].includes(order.status) &&
    !["failed", "refunded"].includes(order.payment_status);
  const stripeTotal = order.stripe_amount_total_pence;
  const amountMismatch =
    stripeTotal !== null && stripeTotal !== order.total_pence;

  return (
    <>
      <Link href="/admin/orders" className="link text-sm">
        All orders
      </Link>
      <div className="mt-6">
        <AdminPageHeader
          title={`Order ${order.reference}`}
          description={`${formatDateTime(orderTime(order))} · ${formatPrice(order.total_pence)}`}
        />
      </div>

      {amountMismatch && (
        <div
          role="alert"
          className="mb-8 max-w-prose border-l-2 border-ink py-1 pl-4 text-sm"
        >
          <p className="font-medium">Stripe charged a different amount</p>
          <p className="text-ink-muted">
            Stripe recorded {formatPrice(stripeTotal)} but this order totals{" "}
            {formatPrice(order.total_pence)}. Check it in Stripe before
            printing.
          </p>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-10 lg:col-span-6">
          <section aria-labelledby="order-state" className="space-y-4">
            <h2 id="order-state" className="eyebrow">
              Status
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y py-5 text-sm">
              <Detail label="Order" value={ORDER_STATUS_LABELS[order.status]} />
              <Detail
                label="Payment"
                value={PAYMENT_STATUS_LABELS[order.payment_status]}
              />
              <Detail
                label="Checkout started"
                value={formatDateTime(order.created_at)}
              />
              <Detail
                label="Paid"
                value={
                  order.paid_at ? formatDateTime(order.paid_at) : "Not paid"
                }
              />
            </dl>
            {inProgress && <OrderProgress order={order} />}
          </section>

          <section aria-labelledby="order-customer" className="space-y-4">
            <h2 id="order-customer" className="eyebrow">
              Customer
            </h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail
                label="Name"
                value={order.customer_name ?? "Not provided"}
              />
              <Detail
                label="Email at checkout"
                value={order.customer_email ?? "Not provided"}
              />
              <Detail
                label="Account"
                value={
                  accountEmail
                    ? `Signed in as ${accountEmail}`
                    : "Guest checkout"
                }
              />
            </dl>
          </section>

          <section aria-labelledby="order-stripe" className="space-y-4">
            <h2 id="order-stripe" className="eyebrow">
              Stripe
            </h2>
            <dl className="grid gap-4 text-sm">
              <Detail
                label="Checkout session"
                value={order.stripe_checkout_session_id ?? "None"}
                mono
              />
              <Detail
                label="Payment"
                value={order.stripe_payment_intent_id ?? "None yet"}
                mono
              />
              <Detail
                label="Amount charged by Stripe"
                value={
                  stripeTotal === null
                    ? "Not recorded yet"
                    : `${formatPrice(stripeTotal)}${amountMismatch ? " (does not match)" : " (matches the order)"}`
                }
              />
            </dl>
            <p className="text-xs text-ink-muted">
              Search for these IDs in the Stripe Dashboard to see the payment.
            </p>
          </section>
        </div>

        <div className="space-y-10 lg:col-span-5 lg:col-start-8">
          <OrderItems order={order} items={items} />
          <OrderDetails order={order} />
        </div>
      </div>
    </>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : undefined}>
        {value}
      </dd>
    </div>
  );
}
