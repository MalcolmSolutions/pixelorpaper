import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// Typed mirror of the catalog tables created by migrations/0004_catalog.sql.
// The SQL migrations (applied by wrangler) are the source of truth: change
// the schema there first, then here. Orders and accounts still use raw SQL
// (src/lib/orders.ts, src/lib/auth.ts).

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const WALL_TONES = ["sand", "grey", "sage", "white"] as const;
export const PRINT_SIZE_NAMES = ["A5", "A4", "A3", "A2"] as const;

export const categories = sqliteTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  wall: text("wall", { enum: WALL_TONES }).notNull().default("sand"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
});

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug),
    imageKey: text("image_key").notNull(),
    imageWidth: integer("image_width").notNull(),
    imageHeight: integer("image_height").notNull(),
    location: text("location"),
    keywords: text("keywords", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    available: integer("available", { mode: "boolean" })
      .notNull()
      .default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    index("products_category").on(t.categorySlug),
    index("products_listing").on(t.available, t.sortOrder),
  ],
);

export const productPrices = sqliteTable(
  "product_prices",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size", { enum: PRINT_SIZE_NAMES }).notNull(),
    pricePence: integer("price_pence").notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.size] })],
);

export type CategoryRow = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductPriceRow = typeof productPrices.$inferSelect;

// --- Orders and accounts (read-only mirror for admin queries) --------------
// Created by migrations 0001–0003 and 0005. All writes to these tables go through
// src/lib/orders.ts and src/lib/auth.ts (raw SQL, payment state only via the
// Stripe webhook); admin code only reads them.

export const ORDER_STATUSES = [
  "pending",
  "placed",
  "fulfilled",
  "cancelled",
  "expired",
  "needs_review",
] as const;
export const PAYMENT_STATUSES = [
  "unpaid",
  "processing",
  "paid",
  "failed",
  "refunded",
] as const;

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role", { enum: ["customer", "admin"] }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  customerId: text("customer_id"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  shippingAddress: text("shipping_address"),
  status: text("status", { enum: ORDER_STATUSES }).notNull(),
  paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES }).notNull(),
  currency: text("currency", { enum: ["gbp"] }).notNull(),
  subtotalPence: integer("subtotal_pence").notNull(),
  shippingPence: integer("shipping_pence").notNull(),
  totalPence: integer("total_pence").notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeAmountTotalPence: integer("stripe_amount_total_pence"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  paidAt: text("paid_at"),
  billingCountry: text("billing_country"),
  downloadConsentAt: text("download_consent_at"),
  refundedAt: text("refunded_at"),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  size: text("size").notNull(),
  unitPricePence: integer("unit_price_pence").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalPence: integer("line_total_pence").notNull(),
});
