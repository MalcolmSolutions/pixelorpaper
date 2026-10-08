import Stripe from "stripe";
import {
  applyAsyncPaymentFailed,
  applyAsyncPaymentSucceeded,
  applyChargeRefunded,
  applyCheckoutCompleted,
  applyCheckoutExpired,
  beginStripeEvent,
  finishStripeEvent,
  type WebhookOutcome,
} from "@/lib/orders";

const session = (event: Stripe.Event) =>
  event.data.object as Stripe.Checkout.Session;

const HANDLERS: Partial<
  Record<Stripe.Event.Type, (event: Stripe.Event) => Promise<WebhookOutcome>>
> = {
  "checkout.session.completed": (e) => applyCheckoutCompleted(session(e)),
  "checkout.session.async_payment_succeeded": (e) =>
    applyAsyncPaymentSucceeded(session(e)),
  "checkout.session.async_payment_failed": (e) =>
    applyAsyncPaymentFailed(session(e)),
  "checkout.session.expired": (e) => applyCheckoutExpired(session(e)),
  "charge.refunded": (e) => applyChargeRefunded(e.data.object as Stripe.Charge),
};

/**
 * Stripe webhook: the only place an order's payment state changes.
 * Events are signature-verified, recorded once by id, and applied with
 * conditional updates, so duplicates and out-of-order delivery are harmless.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The signature covers the exact raw body, so read it before parsing.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await Stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const handler = HANDLERS[event.type];
  if (!handler) return new Response("Ignored", { status: 200 });

  try {
    if (!(await beginStripeEvent(event.id, event.type))) {
      return new Response("Already processed", { status: 200 });
    }
    const result = await handler(event);
    if (result === "unknown_order") {
      console.warn(`Stripe ${event.type} for unknown order`, {
        event: event.id,
        object: (event.data.object as { id?: string }).id,
      });
    }
    await finishStripeEvent(event.id);
    return Response.json({ received: true, result });
  } catch (error) {
    // Not marked processed: Stripe retries, and the retry is applied safely.
    console.error(`Failed to process Stripe event ${event.id}`, error);
    return new Response("Processing failed", { status: 500 });
  }
}
