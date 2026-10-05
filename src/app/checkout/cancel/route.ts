import { getOrder } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Stripe's cancel_url: the customer left Checkout without paying. Expires the
 * session so the stale tab can't be paid later; Stripe then sends
 * checkout.session.expired and the webhook marks the order expired.
 * The cart is untouched, so the customer can try again.
 */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("order") ?? "";

  if (UUID.test(orderId)) {
    const order = await getOrder(orderId);
    if (order?.status === "pending" && order.stripe_checkout_session_id) {
      try {
        await getStripe().checkout.sessions.expire(
          order.stripe_checkout_session_id,
        );
      } catch (error) {
        // Already completed or expired: the webhook has the final say.
        console.warn("Could not expire Checkout session", error);
      }
    }
  }

  return Response.redirect(
    new URL("/cart?checkout=cancelled", request.url),
    303,
  );
}
