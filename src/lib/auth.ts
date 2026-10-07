import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/lib/db";

// Passwordless accounts: a customer proves they own an email address by
// opening a single-use link sent to it. Tokens and session ids are random
// 256-bit values; only their SHA-256 hashes are stored (migration 0002).

const SESSION_COOKIE = "pp_session";
const SESSION_DAYS = 30;
const LINK_MINUTES = 15;
/** Sign-in emails allowed per address per hour. */
const LINKS_PER_HOUR = 5;
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export type Customer = {
  id: string;
  email: string;
  /** Set in the database only (migration 0003); there's no UI to change it. */
  role: "customer" | "admin";
};

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** Lower-cased, trimmed email, or null if it isn't a plausible address. */
export function normaliseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

/**
 * Creates a sign-in token for an email address, or returns null when that
 * address has asked for too many links recently.
 */
export async function createSignInToken(email: string) {
  const db = await getDb();
  const recent = await db
    .prepare(
      `SELECT count(*) AS n FROM sign_in_tokens
       WHERE email = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')`,
    )
    .bind(email)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= LINKS_PER_HOUR) return null;

  const token = randomToken();
  await db
    .prepare(
      `INSERT INTO sign_in_tokens (token_hash, email, expires_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+${LINK_MINUTES} minutes'))`,
    )
    .bind(await sha256(token), email)
    .run();
  return token;
}

/**
 * Uses a sign-in token: once, before it expires. Creates the customer on
 * first sign-in, links earlier guest orders placed with the same (now
 * verified) email, starts a session and sets its cookie.
 * Only callable from Server Actions. Returns false for a bad link.
 */
export async function redeemSignInToken(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length < 32 || token.length > 64) {
    return false;
  }
  const db = await getDb();
  const used = await db
    .prepare(
      `UPDATE sign_in_tokens SET used_at = ${NOW}
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > ${NOW}
       RETURNING email`,
    )
    .bind(await sha256(token))
    .first<{ email: string }>();
  if (!used) return false;

  await db
    .prepare(
      "INSERT INTO customers (id, email) VALUES (?, ?) ON CONFLICT (email) DO NOTHING",
    )
    .bind(crypto.randomUUID(), used.email)
    .run();
  const customer = await db
    .prepare("SELECT id, email, role FROM customers WHERE email = ?")
    .bind(used.email)
    .first<Customer>();
  if (!customer) return false;

  const sessionToken = randomToken();
  await db.batch([
    db
      .prepare(
        `UPDATE orders SET customer_id = ?
         WHERE customer_id IS NULL AND lower(customer_email) = ?`,
      )
      .bind(customer.id, customer.email),
    db
      .prepare(
        `INSERT INTO sessions (id_hash, customer_id, expires_at)
         VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+${SESSION_DAYS} days'))`,
      )
      .bind(await sha256(sessionToken), customer.id),
  ]);

  (await cookies()).set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
  return true;
}

/** The signed-in customer, or null. Cached per request. */
export const getCurrentCustomer = cache(async (): Promise<Customer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 64) return null;
  const db = await getDb();
  return db
    .prepare(
      `SELECT customers.id, customers.email, customers.role
       FROM sessions JOIN customers ON customers.id = sessions.customer_id
       WHERE sessions.id_hash = ? AND sessions.expires_at > ${NOW}`,
    )
    .bind(await sha256(token))
    .first<Customer>();
});

/** Ends the current session. Only callable from Server Actions. */
export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && token.length <= 64) {
    const db = await getDb();
    await db
      .prepare("DELETE FROM sessions WHERE id_hash = ?")
      .bind(await sha256(token))
      .run();
  }
  store.delete(SESSION_COOKIE);
}
