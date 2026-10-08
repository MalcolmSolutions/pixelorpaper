import { getCurrentCustomer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  downloadFilename,
  downloadState,
  guestLinkActive,
  isDownloadItem,
  SIGNED_LINK_SECONDS,
} from "@/lib/download-rules";
import { getCustomerOrder, getOrderBySessionId } from "@/lib/orders";
import { ORIGINALS_BUCKET, presignedDownloadUrl } from "@/lib/r2";
import type { Order, OrderItem } from "@/types/order";

// Server side of digital downloads. The private original is only ever
// reached through openDownload(), which checks who is asking and whether the
// order allows it, logs the download, and returns a short-lived signed link.

/** The site path that serves one download line. */
export function downloadPath(
  order: Pick<Order, "reference">,
  item: Pick<OrderItem, "id">,
  sessionId?: string,
) {
  const path = `/downloads/${encodeURIComponent(order.reference)}/${item.id}`;
  return sessionId
    ? `${path}?session_id=${encodeURIComponent(sessionId)}`
    : path;
}

export type DownloadResult =
  | { kind: "redirect"; url: string }
  | { kind: "not_ready"; order: Order; via: "account" | "link" }
  | { kind: "sign_in" } // signed out, with no working success link
  | { kind: "not_found" };

/**
 * Opens download `itemId` of order `reference` for whoever is asking: the
 * signed-in owner of the order, or anyone holding the order's checkout
 * success link (its Stripe session id) within GUEST_LINK_DAYS of payment.
 * Signed-out visitors without a working link are sent to sign in; anything
 * else is "not found", so it reveals nothing about other orders.
 */
export async function openDownload(
  reference: string,
  itemId: string,
  sessionId: string | null,
): Promise<DownloadResult> {
  const customer = await getCurrentCustomer();
  let via: "account" | "link" = "account";
  let found = customer ? await getCustomerOrder(customer, reference) : null;
  if (!found && sessionId?.startsWith("cs_")) {
    const bySession = await getOrderBySessionId(sessionId);
    if (
      bySession?.order.reference === reference &&
      guestLinkActive(bySession.order)
    ) {
      found = bySession;
      via = "link";
    }
  }
  if (!found) return customer ? { kind: "not_found" } : { kind: "sign_in" };

  const item = found.items.find(
    (i) => String(i.id) === itemId && isDownloadItem(i),
  );
  if (!item) return { kind: "not_found" };
  if (downloadState(found.order) !== "ready") {
    return { kind: "not_ready", order: found.order, via };
  }

  const db = await getDb();
  // The product's current image; its id is the original key if it's gone.
  const product = await db
    .prepare("SELECT image_key FROM products WHERE id = ?")
    .bind(item.product_id)
    .first<{ image_key: string }>();
  const key = product?.image_key ?? item.product_id;

  await db
    .prepare(
      "INSERT INTO download_events (order_id, order_item_id, customer_id) VALUES (?, ?, ?)",
    )
    .bind(found.order.id, item.id, via === "account" ? customer!.id : null)
    .run();

  return {
    kind: "redirect",
    url: presignedDownloadUrl(
      ORIGINALS_BUCKET,
      key,
      SIGNED_LINK_SECONDS,
      downloadFilename(item.product_name, key),
    ),
  };
}
