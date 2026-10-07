import type { Order, OrderStatus } from "@/types/order";

/** Order status in the shop owner's terms. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Checkout started",
  placed: "Placed",
  fulfilled: "Sent",
  cancelled: "Cancelled",
  expired: "Expired",
  needs_review: "Needs review",
};

/** "7 Oct 2026, 14:32" in UK time. */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

/** When the order happened: when it was paid, else when checkout started. */
export const orderTime = (order: Order) => order.paid_at ?? order.created_at;
