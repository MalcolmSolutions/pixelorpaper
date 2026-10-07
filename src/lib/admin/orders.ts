import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDrizzle } from "@/db";
import { customers, orderItems, orders } from "@/db/schema";
import type { Order, OrderItem } from "@/types/order";

// Admin reads of orders (read-only). Callers must have called requireAdmin()
// first. Rows come back in the snake_case shape of src/types/order.ts, so the
// customer-facing order components can be reused.

export const ADMIN_ORDERS_PAGE_SIZE = 50;

const orderColumns = {
  id: orders.id,
  reference: orders.reference,
  customer_id: orders.customerId,
  customer_email: orders.customerEmail,
  customer_name: orders.customerName,
  shipping_address: orders.shippingAddress,
  status: orders.status,
  payment_status: orders.paymentStatus,
  currency: orders.currency,
  subtotal_pence: orders.subtotalPence,
  shipping_pence: orders.shippingPence,
  total_pence: orders.totalPence,
  stripe_checkout_session_id: orders.stripeCheckoutSessionId,
  stripe_payment_intent_id: orders.stripePaymentIntentId,
  stripe_amount_total_pence: orders.stripeAmountTotalPence,
  created_at: orders.createdAt,
  updated_at: orders.updatedAt,
  paid_at: orders.paidAt,
};

/** A checkout that never reached payment: no money involved. */
const abandoned = and(
  inArray(orders.status, ["pending", "expired", "cancelled"]),
  eq(orders.paymentStatus, "unpaid"),
)!;

export const ORDER_FILTERS = {
  all: { label: "All orders", where: sql`not ${abandoned}` },
  to_fulfil: {
    label: "To fulfil",
    where: and(eq(orders.status, "placed"), eq(orders.paymentStatus, "paid"))!,
  },
  review: { label: "Needs review", where: eq(orders.status, "needs_review") },
  processing: {
    label: "Payment processing",
    where: eq(orders.paymentStatus, "processing"),
  },
  sent: { label: "Sent", where: eq(orders.status, "fulfilled") },
  problems: {
    label: "Failed or refunded",
    where: inArray(orders.paymentStatus, ["failed", "refunded"]),
  },
  abandoned: { label: "Abandoned checkouts", where: abandoned },
} satisfies Record<string, { label: string; where: SQL }>;

export type OrderFilter = keyof typeof ORDER_FILTERS;

export function isOrderFilter(value: string): value is OrderFilter {
  return value in ORDER_FILTERS;
}

/** Orders for a filter and optional reference/email search, newest first. */
export async function listOrders({
  filter = "all",
  search = "",
  page = 1,
}: {
  filter?: OrderFilter;
  search?: string;
  page?: number;
}) {
  const db = await getDrizzle();
  const conditions: SQL[] = [ORDER_FILTERS[filter].where];
  if (search) {
    const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(
        like(orders.reference, pattern),
        like(orders.customerEmail, pattern),
        like(orders.customerName, pattern),
      )!,
    );
  }
  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .where(where);
  const rows = await db
    .select({
      ...orderColumns,
      // The outer column is written out in full: Drizzle leaves column names
      // unqualified in single-table queries, which would bind to order_items.
      item_count: sql<number>`(select coalesce(sum(oi.quantity), 0) from order_items oi where oi.order_id = "orders"."id")`,
    })
    .from(orders)
    .where(where)
    .orderBy(desc(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`))
    .limit(ADMIN_ORDERS_PAGE_SIZE)
    .offset((page - 1) * ADMIN_ORDERS_PAGE_SIZE);

  return { total, rows: rows as (Order & { item_count: number })[] };
}

/** Counts per filter, for the filter chips. */
export async function countOrdersByFilter() {
  const db = await getDrizzle();
  const entries = await Promise.all(
    (Object.keys(ORDER_FILTERS) as OrderFilter[]).map(async (key) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(orders)
        .where(ORDER_FILTERS[key].where);
      return [key, total] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<OrderFilter, number>;
}

/** One order with its items and the email of the linked account, if any. */
export async function getOrderForAdmin(reference: string) {
  const db = await getDrizzle();
  const [row] = await db
    .select({ ...orderColumns, account_email: customers.email })
    .from(orders)
    .leftJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.reference, reference));
  if (!row) return null;

  const items = await db
    .select({
      id: orderItems.id,
      order_id: orderItems.orderId,
      product_id: orderItems.productId,
      product_name: orderItems.productName,
      size: orderItems.size,
      unit_price_pence: orderItems.unitPricePence,
      quantity: orderItems.quantity,
      line_total_pence: orderItems.lineTotalPence,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, row.id))
    .orderBy(asc(orderItems.id));

  const { account_email, ...order } = row;
  return {
    order: order as Order,
    items: items as OrderItem[],
    accountEmail: account_email,
  };
}
