import Stripe from "stripe";

export const LEGACY_UNFRAMED_STRIPE_KEY_ENV =
  "STRIPE_LEGACY_UNFRAMED_SECRET_KEY";

export type StripeClientEntry = {
  label: "primary" | "legacy-unframed";
  client: Stripe;
};

function getUniqueKeys(values: Array<string | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

export function getStripeClientEntries(): StripeClientEntry[] {
  const primary = process.env.STRIPE_SECRET_KEY;
  const legacy = process.env[LEGACY_UNFRAMED_STRIPE_KEY_ENV];

  const uniqueKeys = getUniqueKeys([primary, legacy]);

  return uniqueKeys.map((key) => ({
    label: key === legacy ? "legacy-unframed" : "primary",
    client: new Stripe(key),
  }));
}

function isMissingSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  if (code === "resource_missing") {
    return true;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return message.includes("no such checkout.session");
}

export async function retrievePaidCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session | null> {
  const clients = getStripeClientEntries();

  for (const { client } of clients) {
    try {
      const session = await client.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items.data.price.product"],
      });

      if (session.payment_status !== "paid") {
        return null;
      }

      return session;
    } catch (error) {
      if (isMissingSessionError(error)) {
        continue;
      }

      throw error;
    }
  }

  return null;
}
