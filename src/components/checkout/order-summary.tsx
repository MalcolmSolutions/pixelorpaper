import { PrintThumbnail } from "@/components/print-thumbnail";
import { getProductById } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import type { Order, OrderItem, PaymentStatus } from "@/types/order";

// Pieces of an order shown on the post-checkout page and in the account's
// order history. Everything is read from the saved order, never from Stripe.

/** "7 October 2026": when the order was paid (or created, if unpaid). */
export function formatOrderDate(order: Order) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(order.paid_at ?? order.created_at));
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Awaiting payment",
  processing: "Processing",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

/** Items as ordered, with delivery and total. */
export async function OrderItems({
  order,
  items,
}: {
  order: Order;
  items: OrderItem[];
}) {
  const products = await Promise.all(
    items.map((item) => getProductById(item.product_id)),
  );

  return (
    <section aria-labelledby="order-items" className="space-y-4">
      <h2 id="order-items" className="eyebrow">
        Your order
      </h2>
      <ul className="divide-y border-y">
        {items.map((item, i) => (
          <li key={item.id} className="flex gap-4 py-4">
            <PrintThumbnail product={products[i]} />
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
              <div className="min-w-0">
                {/* Name and price as ordered, even if the shop has changed. */}
                <p className="font-medium">{item.product_name}</p>
                <p className="text-sm text-ink-muted tabular-nums">
                  {item.size} print · Qty {item.quantity} ·{" "}
                  {formatPrice(item.unit_price_pence)} each
                </p>
              </div>
              <p className="shrink-0 tabular-nums">
                {formatPrice(item.line_total_pence)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(order.subtotal_pence)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Delivery</dt>
          <dd>
            {order.shipping_pence === 0
              ? "Free"
              : formatPrice(order.shipping_pence)}
          </dd>
        </div>
        <div className="flex justify-between text-base">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPrice(order.total_pence)}</dd>
        </div>
      </dl>
    </section>
  );
}

/** Date, contact email and delivery address, as recorded from Stripe. */
export function OrderDetails({ order }: { order: Order }) {
  const address = parseShippingAddress(order.shipping_address);

  return (
    <section aria-labelledby="order-details" className="space-y-4">
      <h2 id="order-details" className="eyebrow">
        Order details
      </h2>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-ink-muted">Order date</dt>
          <dd>{formatOrderDate(order)}</dd>
        </div>
        {order.customer_email && (
          <div className="space-y-1">
            <dt className="text-ink-muted">Email</dt>
            <dd className="break-words">{order.customer_email}</dd>
          </div>
        )}
        {address && (
          <div className="space-y-1 sm:col-span-2">
            <dt className="text-ink-muted">Delivering to</dt>
            <dd>
              <address className="not-italic">
                {address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/** Address lines from Stripe's shipping_details JSON, or null if unusable. */
function parseShippingAddress(json: string | null): string[] | null {
  if (!json) return null;
  try {
    const { name, address } = JSON.parse(json) as {
      name?: string;
      address?: Partial<
        Record<
          "line1" | "line2" | "city" | "state" | "postal_code" | "country",
          string | null
        >
      >;
    };
    const country =
      address?.country &&
      new Intl.DisplayNames(["en-GB"], { type: "region" }).of(address.country);
    const lines = [
      name,
      address?.line1,
      address?.line2,
      address?.city,
      address?.state,
      address?.postal_code,
      country,
    ].filter((line): line is string => Boolean(line?.trim()));
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}
