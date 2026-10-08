import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderProgress } from "@/components/checkout/order-progress";
import {
  formatOrderDate,
  OrderDetails,
  OrderItems,
  PAYMENT_STATUS_LABELS,
} from "@/components/checkout/order-summary";
import { getCurrentCustomer } from "@/lib/auth";
import { downloadState, isDownloadItem } from "@/lib/download-rules";
import { downloadPath } from "@/lib/downloads";
import { getCustomerOrder } from "@/lib/orders";
import type { Order } from "@/types/order";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

/** One of the signed-in customer's orders. Anyone else's is "not found". */
export default async function AccountOrderPage(
  props: PageProps<"/account/orders/[reference]">,
) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/sign-in");
  const { reference } = await props.params;
  const found = await getCustomerOrder(customer, reference);
  if (!found) notFound();

  const { order, items } = found;
  const hasPrints = items.some((item) => !isDownloadItem(item));
  const state = orderState(order, hasPrints);

  return (
    <div className="container-page section">
      <Link href="/account" className="link text-sm">
        All orders
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-6 lg:col-span-6">
          <div className="space-y-4">
            <p className="eyebrow">Placed {formatOrderDate(order)}</p>
            <h1>Order {order.reference}</h1>
          </div>
          <div className="space-y-4 border-y py-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <dt className="text-ink-muted">Status</dt>
                <dd className="text-base">{state.label}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-ink-muted">Payment</dt>
                <dd className="text-base">
                  {PAYMENT_STATUS_LABELS[order.payment_status]}
                </dd>
              </div>
            </dl>
            <p className="text-sm text-ink-muted">{state.description}</p>
          </div>
          {state.inProgress && (
            <OrderProgress order={order} hasPrints={hasPrints} />
          )}
          <p className="text-sm text-ink-muted">
            Questions about this order?{" "}
            <Link href="/contact" className="link text-ink">
              Contact us
            </Link>{" "}
            and quote {order.reference}.
          </p>
        </div>

        <div className="space-y-8 lg:col-span-5 lg:col-start-8">
          <OrderItems
            order={order}
            items={items}
            downloadHref={(item) => downloadPath(order, item)}
          />
          <OrderDetails order={order} />
        </div>
      </div>
    </div>
  );
}

/**
 * Where the order stands, in the customer's terms, from its saved order and
 * payment status (which only the verified Stripe webhook changes).
 */
function orderState(
  order: Order,
  hasPrints: boolean,
): {
  label: string;
  description: string;
  /** Show the payment → printing → delivery progress. */
  inProgress: boolean;
} {
  const made = hasPrints ? "printed" : "available to download";
  if (order.payment_status === "refunded" || order.refunded_at) {
    return {
      label: "Refunded",
      description: `This order has been refunded and won't be ${made}.`,
      inProgress: false,
    };
  }
  if (order.payment_status === "failed") {
    return {
      label: "Cancelled",
      description: `The payment didn't go through, so you haven't been charged and the order won't be ${made}.`,
      inProgress: false,
    };
  }
  if (downloadState(order) === "outside_uk") {
    return {
      label: "Under review",
      description:
        "Downloads are for UK customers only, and this order was billed outside the UK, so we'll refund the download. We'll be in touch.",
      inProgress: true,
    };
  }
  if (!hasPrints && order.status !== "pending") {
    // Downloads only: nothing to print or send.
    if (order.status === "expired" || order.status === "cancelled") {
      return {
        label: "Not completed",
        description: "Checkout wasn't completed, so no payment was taken.",
        inProgress: false,
      };
    }
    if (order.status === "needs_review") {
      return {
        label: "Under review",
        description:
          "We've received your payment and are checking the order before your download is ready. We'll be in touch.",
        inProgress: true,
      };
    }
    return order.payment_status === "processing"
      ? {
          label: "Payment processing",
          description:
            "Some payment methods take a few days to clear. Your download unlocks once it does.",
          inProgress: true,
        }
      : {
          label: "Ready to download",
          description: "Your download is ready below.",
          inProgress: true,
        };
  }
  switch (order.status) {
    case "pending":
      return {
        label: "Awaiting payment",
        description:
          "Checkout hasn't been completed yet. If you've just paid, this will update shortly.",
        inProgress: false,
      };
    case "expired":
    case "cancelled":
      return {
        label: "Not completed",
        description: "Checkout wasn't completed, so no payment was taken.",
        inProgress: false,
      };
    case "needs_review":
      return {
        label: "Under review",
        description:
          "We've received your payment and are checking the order before it goes to print. We'll be in touch.",
        inProgress: true,
      };
    case "fulfilled":
      return {
        label: "Sent",
        description:
          "Your prints have been sent with free UK tracked delivery.",
        inProgress: true,
      };
    default:
      return order.payment_status === "processing"
        ? {
            label: "Payment processing",
            description:
              "Some payment methods take a few days to clear. Your prints go into production once it does.",
            inProgress: true,
          }
        : {
            label: "Being made",
            description: "Your prints are being made to order.",
            inProgress: true,
          };
  }
}
