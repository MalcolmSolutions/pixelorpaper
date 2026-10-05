import type { Metadata } from "next";
import Link from "next/link";
import { AwaitConfirmation } from "@/components/checkout/await-confirmation";
import { ClearOrderedItems } from "@/components/checkout/clear-ordered-items";
import { getOrderBySessionId } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types/order";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

/**
 * Stripe's success_url. Reaching this page proves nothing: it only shows the
 * order as recorded in the database, which the verified webhook updates.
 */
export default async function CheckoutSuccessPage(
  props: PageProps<"/checkout/success">,
) {
  const { session_id } = await props.searchParams;
  const sessionId =
    typeof session_id === "string" && session_id.startsWith("cs_")
      ? session_id
      : null;
  const found = sessionId ? await getOrderBySessionId(sessionId) : null;

  if (!sessionId || !found) {
    return (
      <div className="container-page section max-w-prose space-y-6">
        <h1>Order not found</h1>
        <p className="text-ink-muted">
          We couldn&rsquo;t find an order for this link. If you&rsquo;ve paid
          and think something is wrong, please get in touch.
        </p>
        <Link href="/products" className="btn btn-outline">
          Continue shopping
        </Link>
      </div>
    );
  }

  const { order, items } = found;
  const message = statusMessage(order);
  const placed = ["placed", "needs_review", "fulfilled"].includes(order.status);

  return (
    <div className="container-page section grid gap-10 lg:grid-cols-12 lg:gap-16">
      {placed && <ClearOrderedItems sessionId={sessionId} />}

      <div className="space-y-4 lg:col-span-6">
        <p className="eyebrow">Order {order.reference}</p>
        <h1>{message.title}</h1>
        <p className="text-ink-muted">{message.body}</p>
        {order.status === "pending" && <AwaitConfirmation />}
        {(order.status === "expired" || order.status === "cancelled") && (
          <Link href="/cart" className="btn btn-outline">
            Back to cart
          </Link>
        )}
        {placed && (
          <Link href="/products" className="link inline-block text-sm">
            Continue shopping
          </Link>
        )}
      </div>

      <div className="lg:col-span-5 lg:col-start-8">
        <ul className="divide-y border-y">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-4 py-4"
            >
              <div>
                <p className="font-medium">{item.product_name}</p>
                <p className="text-sm text-ink-muted tabular-nums">
                  {item.size} · {item.quantity} ×{" "}
                  {formatPrice(item.unit_price_pence)}
                </p>
              </div>
              <p className="shrink-0 tabular-nums">
                {formatPrice(item.line_total_pence)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 pt-4 text-sm">
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
      </div>
    </div>
  );
}

function statusMessage(order: Order) {
  const email = order.customer_email
    ? ` We'll use ${order.customer_email} for any updates about this order.`
    : "";

  if (order.status === "pending") {
    return {
      title: "Thank you",
      body: "We're waiting for Stripe to confirm your payment. This usually takes a few seconds.",
    };
  }
  if (order.status === "expired" || order.status === "cancelled") {
    return {
      title:
        order.payment_status === "failed"
          ? "Payment failed"
          : "Checkout not completed",
      body: "No payment was taken for this order. Your cart is still saved if you'd like to try again.",
    };
  }
  if (order.status === "needs_review") {
    return {
      title: "We're checking your order",
      body: `Your payment was received and we're reviewing the order before it goes to print. We'll be in touch.${email}`,
    };
  }
  if (order.payment_status === "processing") {
    return {
      title: "Order received",
      body: "Your payment is processing. Some payment methods take a few days to clear; your prints go into production once it does.",
    };
  }
  return {
    title: "Order confirmed",
    body: `Thank you. Your prints are made to order and will be sent with free UK tracked delivery.${email}`,
  };
}
