import Stripe from "stripe";

let client: Stripe | undefined;

/**
 * Server-side Stripe client, created on first use so builds don't need the
 * key. Uses the API version pinned by the installed SDK.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // Never create real charges from a development machine.
  if (/^[sr]k_live_/.test(key) && process.env.NODE_ENV !== "production") {
    throw new Error("Refusing to use a live Stripe key outside production");
  }
  client ??= new Stripe(key);
  return client;
}
