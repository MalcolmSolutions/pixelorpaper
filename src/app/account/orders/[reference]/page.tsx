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
import { getCustomerOrder } from "@/lib/orders";

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
  const showProgress = ["placed", "needs_review", "fulfilled"].includes(
    order.status,
  );

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
            <p className="text-ink-muted">
              Payment: {PAYMENT_STATUS_LABELS[order.payment_status]}
              {order.status === "needs_review" &&
                ". We're reviewing this order before it goes to print."}
            </p>
          </div>
          {showProgress && <OrderProgress order={order} />}
          <p className="text-sm text-ink-muted">
            Questions about this order?{" "}
            <Link href="/contact" className="link text-ink">
              Contact us
            </Link>{" "}
            and quote {order.reference}.
          </p>
        </div>

        <div className="space-y-8 lg:col-span-5 lg:col-start-8">
          <OrderItems order={order} items={items} />
          <OrderDetails order={order} />
        </div>
      </div>
    </div>
  );
}
