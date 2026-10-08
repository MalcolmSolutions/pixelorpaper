-- Digital downloads (order_items.size = 'DIGITAL').
-- Downloads unlock only for a paid, placed order billed to the UK that
-- hasn't been refunded (src/lib/downloads.ts). Payment fields are still
-- written only by the Stripe webhook.

-- ISO country code of the billing address Stripe collected, e.g. GB.
ALTER TABLE orders ADD COLUMN billing_country TEXT;
-- When the customer agreed, before paying, that downloads start straight
-- away and they lose the 14-day right to cancel them. NULL if no downloads.
ALTER TABLE orders ADD COLUMN download_consent_at TEXT;
-- When Stripe reported the payment fully refunded. Kept separately from
-- payment_status because a fulfilled order must stay 'paid' (orders CHECK).
ALTER TABLE orders ADD COLUMN refunded_at TEXT;

-- One row per download link used, for support and spotting shared links.
CREATE TABLE download_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  order_item_id  INTEGER NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
  -- Signed-in customer, or NULL when opened from the checkout success link.
  customer_id    TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX download_events_item ON download_events (order_item_id, created_at);
