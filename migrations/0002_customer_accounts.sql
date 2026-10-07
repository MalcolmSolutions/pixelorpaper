-- Passwordless customer accounts: emailed single-use sign-in links and
-- server-side sessions. Only SHA-256 hashes of tokens are stored, so a copy
-- of the database can't be used to sign in.

CREATE TABLE customers (
  id          TEXT PRIMARY KEY,                       -- crypto.randomUUID()
  email       TEXT NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sign_in_tokens (
  token_hash  TEXT PRIMARY KEY,
  email       TEXT NOT NULL CHECK (email = lower(trim(email))),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);

-- Rate limiting counts recent tokens per email.
CREATE INDEX sign_in_tokens_email ON sign_in_tokens (email, created_at);

CREATE TABLE sessions (
  id_hash      TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at   TEXT NOT NULL
);

CREATE INDEX sessions_customer ON sessions (customer_id);

-- Linking earlier guest orders to an account by its verified email.
CREATE INDEX orders_customer_email ON orders (lower(customer_email));
