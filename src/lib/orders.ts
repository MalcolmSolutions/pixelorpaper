import type Stripe from "stripe";
import type { Customer } from "@/lib/auth";
import type { CartLine } from "@/lib/cart";
import { getDb } from "@/lib/db";
import type { Order, OrderItem } from "@/types/order";

// All order writes go through this module. Payment state only ever changes
// from verified Stripe webhook events (app/api/webhooks/stripe), and each
// update is conditional on the current state, so repeated or out-of-order
// events can't move an order backwards.

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
// Crockford base32 (no I, L, O, U), so references are easy to read out.
const REFERENCE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function newReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `PP-${Array.from(bytes, (b) => REFERENCE_ALPHABET[b % 32]).join("")}`;
}

/**
 * A pending order and its items, priced from the server-side cart, linked to
 * the signed-in customer if there is one.
 */
export async function createPendingOrder(
  lines: CartLine[],
  customerId: string | null = null,
) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const reference = newReference();
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = 0; // Free UK delivery.

  // A batch runs as one transaction: the order and its items or nothing.
  await db.batch([
    db
      .prepare(
        `INSERT INTO orders (id, reference, customer_id, subtotal_pence, shipping_pence, total_pence)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, reference, customerId, subtotal, shipping, subtotal + shipping),
    ...lines.map((line) =>
      db
        .prepare(
          `INSERT INTO order_items
             (order_id, product_id, product_name, size, unit_price_pence, quantity, line_total_pence)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          line.product.id,
          line.product.name,
          line.size.name,
          line.unitPrice,
          line.quantity,
          line.lineTotal,
        ),
    ),
  ]);

  return { id, reference };
}

export async function attachCheckoutSession(
  orderId: string,
  sessionId: string,
) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE orders SET stripe_checkout_session_id = ?
       WHERE id = ? AND status = 'pending' AND stripe_checkout_session_id IS NULL`,
    )
    .bind(sessionId, orderId)
    .run();
}

/** Checkout could not be started (e.g. Stripe was unreachable). */
export async function markOrderCancelled(orderId: string) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE orders SET status = 'cancelled'
       WHERE id = ? AND status = 'pending' AND stripe_checkout_session_id IS NULL`,
    )
    .bind(orderId)
    .run();
}

export async function getOrder(id: string) {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .bind(id)
    .first<Order>();
}

/**
 * An order belongs to a customer if it's linked to their account, or if it
 * was a guest order placed with their (verified) account email.
 */
const OWNED_BY =
  "(customer_id = ? OR (customer_id IS NULL AND lower(customer_email) = ?))";

/**
 * Orders shown in a customer's history: everything that reached checkout
 * completion, including failed delayed payments, but not abandoned
 * checkouts. Newest first.
 */
export async function getOrdersForCustomer(customer: Customer) {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT orders.*,
              (SELECT coalesce(sum(quantity), 0) FROM order_items
               WHERE order_items.order_id = orders.id) AS item_count
       FROM orders
       WHERE ${OWNED_BY}
         AND (status IN ('placed', 'needs_review', 'fulfilled')
              OR payment_status IN ('failed', 'refunded'))
       ORDER BY coalesce(paid_at, created_at) DESC`,
    )
    .bind(customer.id, customer.email)
    .all<Order & { item_count: number }>();
  return results;
}

/** One of the customer's orders with its items, or null if not theirs. */
export async function getCustomerOrder(customer: Customer, reference: string) {
  const db = await getDb();
  const order = await db
    .prepare(`SELECT * FROM orders WHERE reference = ? AND ${OWNED_BY}`)
    .bind(reference, customer.id, customer.email)
    .first<Order>();
  if (!order) return null;
  const { results: items } = await db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .bind(order.id)
    .all<OrderItem>();
  return { order, items };
}

export async function getOrderBySessionId(sessionId: string) {
  const db = await getDb();
  const order = await db
    .prepare("SELECT * FROM orders WHERE stripe_checkout_session_id = ?")
    .bind(sessionId)
    .first<Order>();
  if (!order) return null;
  const { results: items } = await db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .bind(order.id)
    .all<OrderItem>();
  return { order, items };
}

// --- Webhook updates -------------------------------------------------------

/** Matches a Checkout Session to its order by our id and Stripe's id. */
const SESSION_MATCH =
  "id = ? AND (stripe_checkout_session_id = ? OR stripe_checkout_session_id IS NULL)";

function orderIdOf(session: Stripe.Checkout.Session) {
  return session.metadata?.order_id ?? session.client_reference_id ?? null;
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

export type WebhookOutcome = "updated" | "unchanged" | "unknown_order";

async function outcome(
  orderId: string | null,
  changes: number,
): Promise<WebhookOutcome> {
  if (changes > 0) return "updated";
  if (orderId && (await getOrder(orderId))) return "unchanged";
  return "unknown_order";
}

/**
 * checkout.session.completed: the customer finished Checkout, paid now or
 * processing (delayed methods). Stripe's amount is reconciled against ours;
 * a mismatch is flagged for review instead of being placed.
 */
export async function applyCheckoutCompleted(session: Stripe.Checkout.Session) {
  const db = await getDb();
  const orderId = orderIdOf(session);
  const paid = session.payment_status === "paid";
  const shipping = session.collected_information?.shipping_details ?? null;

  const result = await db
    .prepare(
      `UPDATE orders SET
         status = CASE WHEN ? = currency AND ? = total_pence
                       THEN 'placed' ELSE 'needs_review' END,
         payment_status = ?,
         paid_at = CASE WHEN ? THEN ${NOW} ELSE paid_at END,
         stripe_checkout_session_id = ?,
         stripe_payment_intent_id = ?,
         stripe_amount_total_pence = ?,
         customer_email = ?,
         customer_name = ?,
         shipping_address = ?
       WHERE ${SESSION_MATCH} AND status = 'pending' AND payment_status = 'unpaid'`,
    )
    .bind(
      session.currency,
      session.amount_total,
      paid ? "paid" : "processing",
      paid ? 1 : 0,
      session.id,
      paymentIntentId(session),
      session.amount_total,
      session.customer_details?.email ?? null,
      shipping?.name ?? session.customer_details?.name ?? null,
      shipping ? JSON.stringify(shipping) : null,
      orderId,
      session.id,
    )
    .run();
  return outcome(orderId, result.meta.changes);
}

/** checkout.session.async_payment_succeeded: a delayed payment cleared. */
export async function applyAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session,
) {
  const db = await getDb();
  const orderId = orderIdOf(session);
  const result = await db
    .prepare(
      `UPDATE orders SET payment_status = 'paid', paid_at = ${NOW}
       WHERE ${SESSION_MATCH} AND payment_status = 'processing'`,
    )
    .bind(orderId, session.id)
    .run();
  return outcome(orderId, result.meta.changes);
}

/** checkout.session.async_payment_failed: a delayed payment failed. */
export async function applyAsyncPaymentFailed(
  session: Stripe.Checkout.Session,
) {
  const db = await getDb();
  const orderId = orderIdOf(session);
  const result = await db
    .prepare(
      `UPDATE orders SET payment_status = 'failed',
         status = CASE WHEN status = 'placed' THEN 'cancelled' ELSE status END
       WHERE ${SESSION_MATCH} AND payment_status = 'processing'`,
    )
    .bind(orderId, session.id)
    .run();
  return outcome(orderId, result.meta.changes);
}

/** checkout.session.expired: abandoned or cancelled before paying. */
export async function applyCheckoutExpired(session: Stripe.Checkout.Session) {
  const db = await getDb();
  const orderId = orderIdOf(session);
  const result = await db
    .prepare(
      `UPDATE orders SET status = 'expired'
       WHERE ${SESSION_MATCH} AND status = 'pending' AND payment_status = 'unpaid'`,
    )
    .bind(orderId, session.id)
    .run();
  return outcome(orderId, result.meta.changes);
}

// --- Webhook event log -----------------------------------------------------

/** Records an event; returns false if it was already fully processed. */
export async function beginStripeEvent(id: string, type: string) {
  const db = await getDb();
  await db
    .prepare(
      "INSERT INTO stripe_events (id, type) VALUES (?, ?) ON CONFLICT (id) DO NOTHING",
    )
    .bind(id, type)
    .run();
  const row = await db
    .prepare("SELECT processed_at FROM stripe_events WHERE id = ?")
    .bind(id)
    .first<{ processed_at: string | null }>();
  return row?.processed_at == null;
}

export async function finishStripeEvent(id: string) {
  const db = await getDb();
  await db
    .prepare(`UPDATE stripe_events SET processed_at = ${NOW} WHERE id = ?`)
    .bind(id)
    .run();
}
