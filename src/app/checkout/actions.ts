"use server";

import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/auth";
import { isDigital } from "@/lib/print-sizes";
import { getCart, readCartEntries, writeCartEntries } from "@/lib/cart";
import {
  attachCheckoutSession,
  createPendingOrder,
  getOrderBySessionId,
  markOrderCancelled,
} from "@/lib/orders";
import { isProductStillAvailable } from "@/lib/products";
import { siteUrl } from "@/lib/site";
import { getStripe } from "@/lib/stripe";

// Tags these sessions in the Stripe Dashboard.
const INTEGRATION_IDENTIFIER = "pixelorpaper-checkout-qhvmzrta";
// Abandoned sessions expire after an hour (Stripe's minimum is 30 minutes).
const SESSION_LIFETIME_SECONDS = 60 * 60;

/**
 * Starts Stripe Checkout for the current cart. Takes nothing from the client
 * but the download consent box: lines come from the cart cookie, prices from
 * the server-side price list, and every print is re-checked before an order
 * is made.
 */
export async function startCheckout(formData: FormData) {
  const cart = await getCart();
  if (cart.lines.length === 0) redirect("/cart");
  const hasDownloads = cart.lines.some((line) => isDigital(line.size));
  const hasPrints = cart.lines.some((line) => !isDigital(line.size));
  // Downloads start once paid, so UK law needs the customer's prior consent
  // to losing the 14-day right to cancel them.
  if (hasDownloads && formData.get("download_consent") !== "yes") {
    redirect("/cart?checkout=consent");
  }
  if (cart.removedCount > 0) {
    await writeCartEntries(await readCartEntries()); // drops unavailable lines
    redirect("/cart?checkout=unavailable");
  }

  // Revalidate stock with fresh data, not the hour-long catalog cache.
  let available: boolean[];
  try {
    available = await Promise.all(
      cart.lines.map((line) => isProductStillAvailable(line.product.id)),
    );
  } catch (error) {
    console.error("Stock check failed", error);
    redirect("/cart?checkout=error");
  }
  if (available.includes(false)) {
    const gone = new Set(
      cart.lines.filter((_, i) => !available[i]).map((l) => l.product.id),
    );
    const entries = await readCartEntries();
    await writeCartEntries(entries.filter((e) => !gone.has(e.productId)));
    redirect("/cart?checkout=unavailable");
  }

  const customer = await getCurrentCustomer();
  const order = await createPendingOrder(cart.lines, customer?.id ?? null, {
    downloadConsent: hasDownloads,
  });
  const site = siteUrl();

  let checkoutUrl: string;
  try {
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: cart.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "gbp",
            unit_amount: line.unitPrice,
            product_data: {
              name: isDigital(line.size)
                ? `${line.product.name} (digital download)`
                : `${line.product.name} (${line.size.name} print)`,
              images: [line.product.image.src],
              metadata: { product_id: line.product.id, size: line.size.name },
            },
          },
        })),
        client_reference_id: order.id,
        // Signed-in customers pay with their verified account email.
        ...(customer && { customer_email: customer.email }),
        metadata: { order_id: order.id, order_reference: order.reference },
        payment_intent_data: {
          metadata: { order_id: order.id, order_reference: order.reference },
        },
        ...(hasPrints && {
          shipping_address_collection: { allowed_countries: ["GB"] },
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                display_name: "Free UK tracked delivery",
                fixed_amount: { amount: 0, currency: "gbp" },
              },
            },
          ],
        }),
        // Downloads are UK only, judged by the billing address (checked by
        // the webhook, since Checkout can't restrict billing countries).
        ...(hasDownloads && {
          billing_address_collection: "required",
          custom_text: {
            submit: {
              message:
                "Digital downloads are for UK billing addresses only. They're ready as soon as payment clears, and you've agreed that you then lose the right to cancel them.",
            },
          },
        }),
        expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
        integration_identifier: INTEGRATION_IDENTIFIER,
        success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/checkout/cancel?order=${order.id}`,
      },
      { idempotencyKey: `checkout-session-${order.id}` },
    );
    if (!session.url) throw new Error("Stripe returned no Checkout URL");
    await attachCheckoutSession(order.id, session.id);
    checkoutUrl = session.url;
  } catch (error) {
    console.error("Could not start Stripe Checkout", error);
    await markOrderCancelled(order.id);
    redirect("/cart?checkout=error");
  }

  redirect(checkoutUrl);
}

/**
 * Removes a placed order's prints from the cart. Only acts once the webhook
 * has recorded the order as placed; the browser can't mark anything paid.
 */
export async function clearOrderedItems(sessionId: string) {
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) return;
  const found = await getOrderBySessionId(sessionId);
  const placed = ["placed", "needs_review", "fulfilled"];
  if (!found || !placed.includes(found.order.status)) return;

  const ordered = new Set(found.items.map((i) => `${i.product_id}\n${i.size}`));
  const entries = await readCartEntries();
  const remaining = entries.filter(
    (e) => !ordered.has(`${e.productId}\n${e.size}`),
  );
  if (remaining.length !== entries.length) await writeCartEntries(remaining);
}
