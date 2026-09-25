import Stripe from "stripe";

export const runtime = "edge";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ok", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return new Response("ok", { status: 200 });
  }

  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product"],
  });

  const printItems = (fullSession.line_items?.data ?? [])
    .map((line) => {
      const product = line.price?.product;
      if (!product || typeof product === "string") {
        return null;
      }

      if ("deleted" in product) {
        return null;
      }

      if (product.metadata.purchase_type !== "print") {
        return null;
      }

      return {
        title: product.name,
        quantity: line.quantity ?? 1,
        printSizeKey: product.metadata.print_size_key,
        sourceImagePath:
          product.metadata.download_key ?? product.metadata.image_path,
      };
    })
    .filter(Boolean);

  if (printItems.length === 0) {
    return new Response("ok", { status: 200 });
  }

  console.info("Digitalab manual fulfillment required", {
    orderSource: "UNFRAMED",
    stripeSessionId: session.id,
    customer: fullSession.customer_details,
    shippingAddress: fullSession.customer_details?.address,
    items: printItems,
    csvExportPath: "/api/orders/prints/csv",
  });

  return new Response("ok", { status: 200 });
}
