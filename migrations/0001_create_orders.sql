-- Orders for Stripe checkout.
-- Money is integer pence (GBP, VAT inclusive), matching src/lib/print-sizes.ts.
-- Order status (our fulfilment lifecycle) and payment status (what Stripe
-- reports) are separate columns so neither is inferred from the other.

CREATE TABLE orders (
  id                          TEXT PRIMARY KEY,         -- crypto.randomUUID()
  reference                   TEXT NOT NULL UNIQUE,     -- customer-facing, e.g. PP-7K3QX9MD
  -- Authenticated customer's id. NULL for guest checkout: the store has no
  -- accounts yet, so this is filled in once authentication exists.
  customer_id                 TEXT,
  customer_email              TEXT,                     -- from Stripe Checkout
  customer_name               TEXT,                     -- from Stripe Checkout
  shipping_address            TEXT
                              CHECK (shipping_address IS NULL OR json_valid(shipping_address)),

  status                      TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'placed', 'fulfilled',
                                                'cancelled', 'expired', 'needs_review')),
  payment_status              TEXT NOT NULL DEFAULT 'unpaid'
                              CHECK (payment_status IN ('unpaid', 'processing', 'paid',
                                                        'failed', 'refunded')),

  currency                    TEXT NOT NULL DEFAULT 'gbp' CHECK (currency = 'gbp'),
  subtotal_pence              INTEGER NOT NULL CHECK (subtotal_pence >= 0),
  shipping_pence              INTEGER NOT NULL DEFAULT 0 CHECK (shipping_pence >= 0),
  total_pence                 INTEGER NOT NULL
                              CHECK (total_pence = subtotal_pence + shipping_pence),

  stripe_checkout_session_id  TEXT UNIQUE,              -- cs_...
  stripe_payment_intent_id    TEXT UNIQUE,              -- pi_...
  stripe_amount_total_pence   INTEGER,                  -- Stripe's amount_total, for reconciliation

  created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  paid_at                     TEXT,

  CHECK (payment_status NOT IN ('paid', 'refunded') OR paid_at IS NOT NULL),
  CHECK (status <> 'fulfilled' OR payment_status = 'paid')
);

CREATE INDEX orders_customer ON orders (customer_id, created_at);
CREATE INDEX orders_status ON orders (status, created_at);

CREATE TRIGGER orders_touch_updated_at
AFTER UPDATE ON orders
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE orders
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

-- One row per print and size, priced when the order was created.
CREATE TABLE order_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id        TEXT NOT NULL,                      -- R2 key, e.g. landscapes/foo.jpg
  product_name      TEXT NOT NULL,                      -- snapshot
  size              TEXT NOT NULL,                      -- snapshot, e.g. A4
  unit_price_pence  INTEGER NOT NULL CHECK (unit_price_pence > 0),
  quantity          INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  line_total_pence  INTEGER NOT NULL
                    CHECK (line_total_pence = unit_price_pence * quantity),
  UNIQUE (order_id, product_id, size)
);

CREATE INDEX order_items_order ON order_items (order_id);

-- Stripe webhook events already seen, so duplicates are processed once.
CREATE TABLE stripe_events (
  id            TEXT PRIMARY KEY,                       -- evt_...
  type          TEXT NOT NULL,
  received_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  processed_at  TEXT
);
