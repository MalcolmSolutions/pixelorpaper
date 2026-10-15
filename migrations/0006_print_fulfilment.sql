-- Print fulfilment through theprintspace (creativehub API).
-- Paid print orders become print jobs (src/lib/printspace/fulfilment.ts),
-- which are quoted and, in live mode, placed with theprintspace. Downloads
-- are never sent.

-- Settings kept by the fulfilment code, e.g. the id of the draft drop that
-- holds our products at theprintspace.
CREATE TABLE printspace_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- A print set up at theprintspace: its artwork upload and product there.
CREATE TABLE printspace_products (
  product_id     TEXT PRIMARY KEY,                     -- our products.id
  ch_upload_id   TEXT NOT NULL,
  ch_product_id  TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- theprintspace's variant id for each of a print's sizes.
CREATE TABLE printspace_variants (
  product_id     TEXT NOT NULL REFERENCES printspace_products (product_id)
                 ON DELETE CASCADE,
  size           TEXT NOT NULL,                        -- A5 | A4 | A3 | A2
  ch_variant_id  TEXT NOT NULL,
  PRIMARY KEY (product_id, size)
);

-- One per order with prints.
CREATE TABLE print_jobs (
  order_id           TEXT PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued', 'sending', 'held', 'quoted',
                                       'submitted', 'dispatched', 'failed',
                                       'cancelled')),
  -- Why a held or failed job needs the admin, in plain words.
  hold_reason        TEXT,
  -- theprintspace's price for the print lines, VAT inclusive, from a quote.
  quoted_cost_pence  INTEGER,
  quoted_at          TEXT,
  ch_order_id        TEXT UNIQUE,
  ch_order_number    TEXT,
  ch_status          TEXT,                             -- as theprintspace reports it
  date_due           TEXT,
  attempts           INTEGER NOT NULL DEFAULT 0,
  last_error         TEXT,
  -- When a worker took the job ('sending'), so a crashed attempt is retried.
  locked_at          TEXT,
  submitted_at       TEXT,
  last_checked_at    TEXT,
  dispatched_at      TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (status <> 'submitted' OR ch_order_id IS NOT NULL)
);

CREATE INDEX print_jobs_status ON print_jobs (status, updated_at);

CREATE TRIGGER print_jobs_touch_updated_at
AFTER UPDATE ON print_jobs
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE print_jobs
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE order_id = NEW.order_id;
END;
