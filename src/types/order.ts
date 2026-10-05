/** Rows of the D1 tables in migrations/0001_create_orders.sql. */

/** Our fulfilment lifecycle. */
export type OrderStatus =
  | "pending" // created, customer hasn't finished Stripe Checkout
  | "placed" // checkout completed (payment paid or processing)
  | "fulfilled"
  | "cancelled" // checkout couldn't be started
  | "expired" // Stripe Checkout session expired unpaid
  | "needs_review"; // Stripe's amount didn't match ours

/** What Stripe reports about the payment. */
export type PaymentStatus =
  | "unpaid"
  | "processing" // delayed payment methods, e.g. Bacs Direct Debit
  | "paid"
  | "failed"
  | "refunded";

export type Order = {
  id: string;
  reference: string;
  /** Authenticated customer; null for guest checkout. */
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  /** JSON from Stripe Checkout. */
  shipping_address: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  currency: "gbp";
  subtotal_pence: number;
  shipping_pence: number;
  total_pence: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_amount_total_pence: number | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type OrderItem = {
  id: number;
  order_id: string;
  product_id: string;
  product_name: string;
  size: string;
  unit_price_pence: number;
  quantity: number;
  line_total_pence: number;
};

export type StripeEventRecord = {
  id: string;
  type: string;
  received_at: string;
  processed_at: string | null;
};
