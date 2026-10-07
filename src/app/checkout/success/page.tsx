import type { Metadata } from "next";
import Link from "next/link";
import { AwaitConfirmation } from "@/components/checkout/await-confirmation";
import { ClearOrderedItems } from "@/components/checkout/clear-ordered-items";
import { OrderProgress } from "@/components/checkout/order-progress";
import { OrderDetails, OrderItems } from "@/components/checkout/order-summary";
import { getOrderBySessionId } from "@/lib/orders";
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
  const inProgress = placed || order.status === "pending";

  return (
    <div className="container-page section grid gap-10 lg:grid-cols-12 lg:gap-16">
      {placed && <ClearOrderedItems sessionId={sessionId} />}

      <div className="space-y-6 lg:col-span-6">
        <div className="space-y-4">
          <p className="eyebrow">Order {order.reference}</p>
          <h1>{message.title}</h1>
          <p className="text-ink-muted">{message.body}</p>
        </div>
        {inProgress && <OrderProgress order={order} />}
        {order.status === "pending" && <AwaitConfirmation />}
        {message.action && (
          <div className="pt-2">
            <Link
              href={message.action.href}
              className={
                message.action.primary ? "btn btn-outline" : "link text-sm"
              }
            >
              {message.action.label}
            </Link>
          </div>
        )}
        {message.help && (
          <p className="text-sm text-ink-muted">
            Questions about this order?{" "}
            <Link href="/contact" className="link text-ink">
              Contact us
            </Link>{" "}
            and quote {order.reference}.
          </p>
        )}
      </div>

      <div className="space-y-8 lg:col-span-5 lg:col-start-8">
        <OrderItems order={order} items={items} />

        {placed && <OrderDetails order={order} />}
      </div>
    </div>
  );
}

type StatusMessage = {
  title: string;
  body: string;
  action?: { href: string; label: string; primary?: boolean };
  /** Show the "Contact us" line. */
  help?: boolean;
};

function statusMessage(order: Order): StatusMessage {
  const email = order.customer_email
    ? ` We'll use ${order.customer_email} for any updates about this order.`
    : "";

  if (order.status === "pending") {
    return {
      title: "Thank you",
      body: "We're waiting for Stripe to confirm your payment. This usually takes a few seconds.",
    };
  }
  if (order.payment_status === "failed") {
    // A delayed payment (e.g. bank debit) failed after the order was placed,
    // by which time the prints had already left the cart.
    return {
      title: "Payment failed",
      body: "Your payment for this order didn't go through, so you haven't been charged. To order again, add the prints to your cart and check out once more.",
      action: { href: "/products", label: "Shop prints", primary: true },
      help: true,
    };
  }
  if (order.status === "expired" || order.status === "cancelled") {
    return {
      title: "Checkout not completed",
      body: "No payment was taken for this order. Your cart is still saved if you'd like to try again.",
      action: { href: "/cart", label: "Back to cart", primary: true },
    };
  }
  if (order.status === "needs_review") {
    return {
      title: "We're checking your order",
      body: `Your payment was received and we're reviewing the order before it goes to print. We'll be in touch.${email}`,
      action: { href: "/products", label: "Continue shopping" },
      help: true,
    };
  }
  if (order.payment_status === "processing") {
    return {
      title: "Order received",
      body: `Your payment is processing. Some payment methods take a few days to clear; your prints go into production once it does.${email}`,
      action: { href: "/products", label: "Continue shopping" },
      help: true,
    };
  }
  return {
    title: "Order confirmed",
    body: `Thank you. Your prints are made to order and will be sent with free UK tracked delivery.${email}`,
    action: { href: "/products", label: "Continue shopping" },
  };
}
