import { DIGITAL_DOWNLOAD } from "@/lib/print-sizes";
import type { Order, OrderItem } from "@/types/order";

// When a paid digital download may be fetched. Pure functions over saved
// orders, so the rules are unit-tested (download-rules.test.ts) and shared by
// the download route and the order pages.

/** Downloads are sold to UK customers only, judged by billing address. */
export const DOWNLOAD_COUNTRY = "GB";
/** How long the checkout success link alone can fetch downloads. */
export const GUEST_LINK_DAYS = 7;
/** Lifetime of the signed R2 link a download redirects to. */
export const SIGNED_LINK_SECONDS = 5 * 60;

export type DownloadState =
  | "ready"
  | "awaiting_payment" // checkout open, or a delayed payment still clearing
  | "outside_uk" // billed outside the UK: can't be supplied
  | "on_hold" // under review (e.g. amount mismatch)
  | "refunded"
  | "unavailable"; // checkout abandoned or payment failed

export const isDownloadItem = (item: Pick<OrderItem, "size">) =>
  item.size === DIGITAL_DOWNLOAD.name;

export function downloadState(
  order: Pick<
    Order,
    "status" | "payment_status" | "billing_country" | "refunded_at"
  >,
): DownloadState {
  if (order.refunded_at || order.payment_status === "refunded") {
    return "refunded";
  }
  if (
    order.payment_status === "failed" ||
    order.status === "expired" ||
    order.status === "cancelled"
  ) {
    return "unavailable";
  }
  if (order.billing_country && order.billing_country !== DOWNLOAD_COUNTRY) {
    return "outside_uk";
  }
  if (order.status === "pending" || order.payment_status !== "paid") {
    return "awaiting_payment";
  }
  if (
    (order.status === "placed" || order.status === "fulfilled") &&
    order.billing_country === DOWNLOAD_COUNTRY
  ) {
    return "ready";
  }
  return "on_hold";
}

/** What a download line says when it can't be downloaded yet (or at all). */
export const DOWNLOAD_STATE_NOTES: Record<
  Exclude<DownloadState, "ready">,
  string
> = {
  awaiting_payment: "Ready to download once your payment clears.",
  outside_uk:
    "Downloads are for UK customers only, so this one can't be supplied. We'll refund it.",
  on_hold: "On hold while we check your order.",
  refunded: "Refunded, so no longer available.",
  unavailable: "Not available: this order wasn't paid.",
};

/**
 * Whether the checkout success link (its Stripe session id) still opens
 * downloads on its own. After that, the customer signs in with the order's
 * email address.
 */
export function guestLinkActive(
  order: Pick<Order, "paid_at">,
  now: Date = new Date(),
) {
  if (!order.paid_at) return false;
  const age = now.getTime() - new Date(order.paid_at).getTime();
  return age >= 0 && age < GUEST_LINK_DAYS * 24 * 60 * 60 * 1000;
}

/** "Venice Skyline with Campanile" + "x/abc.JPG" → "venice-skyline-with-campanile.jpg" */
export function downloadFilename(productName: string, imageKey: string) {
  const extension =
    imageKey.match(/\.([a-z0-9]{2,4})$/i)?.[1].toLowerCase() ?? "jpg";
  const base =
    productName
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "pixel-or-paper";
  return `${base}.${extension === "jpeg" ? "jpg" : extension}`;
}
