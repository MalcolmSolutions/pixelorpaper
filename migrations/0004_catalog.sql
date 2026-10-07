-- The product catalog in D1 (R2 keeps only the image files).
-- Mirrored for typed queries by src/db/schema.ts; keep the two in step.

CREATE TABLE categories (
  slug         TEXT PRIMARY KEY
               CHECK (slug <> '' AND slug NOT GLOB '*[^a-z0-9-]*'),
  name         TEXT NOT NULL CHECK (trim(name) <> ''),
  description  TEXT NOT NULL DEFAULT '',
  wall         TEXT NOT NULL DEFAULT 'sand'
               CHECK (wall IN ('sand', 'grey', 'sage', 'white')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE products (
  -- The R2 image key for imported prints (e.g. landscapes/foo.jpg), so
  -- order_items.product_id from before the move still resolves.
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE
                 CHECK (slug <> '' AND slug NOT GLOB '*[^a-z0-9-]*'),
  name           TEXT NOT NULL CHECK (trim(name) <> ''),
  description    TEXT NOT NULL DEFAULT '',
  category_slug  TEXT NOT NULL REFERENCES categories (slug),
  image_key      TEXT NOT NULL,
  image_width    INTEGER NOT NULL CHECK (image_width > 0),
  image_height   INTEGER NOT NULL CHECK (image_height > 0),
  location       TEXT,
  keywords       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(keywords)),
  -- Made to order; this is the "in stock" switch for a later step.
  available      INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  -- Ordering of the default listing (curated first, mixed categories).
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX products_category ON products (category_slug);
CREATE INDEX products_listing ON products (available, sort_order);

-- One price per product and print size, in pence, VAT inclusive.
CREATE TABLE product_prices (
  product_id   TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  size         TEXT NOT NULL CHECK (size IN ('A5', 'A4', 'A3', 'A2')),
  price_pence  INTEGER NOT NULL CHECK (price_pence BETWEEN 100 AND 100000),
  PRIMARY KEY (product_id, size)
);

CREATE TRIGGER categories_touch_updated_at
AFTER UPDATE ON categories
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE categories SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE slug = NEW.slug;
END;

CREATE TRIGGER products_touch_updated_at
AFTER UPDATE ON products
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE products SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
