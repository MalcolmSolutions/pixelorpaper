import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCatalogProducts } from "@/lib/catalog";
import {
  getPrintSizeByKey,
  getVariantUnitPriceCents,
  type PurchaseVariant,
} from "@/lib/purchase";

// Note: R2 catalog loading is optional; will use fallback if unavailable
export const runtime = "edge";

type Payload = {
  items?: Array<{
    productId: string;
    quantity: number;
    purchaseType: "print" | "download";
    printSizeKey?: string;
  }>;
};

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!stripeKey) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY. Add it in .env.local." },
      { status: 500 },
    );
  }

  const body = (await req.json()) as Payload;
  const items = body.items ?? [];

  if (items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const products = await getCatalogProducts();
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product) {
      continue;
    }

    let variant: PurchaseVariant;
    if (item.purchaseType === "print") {
      const size = getPrintSizeByKey(item.printSizeKey ?? "size_10x8");
      if (!size) {
        continue;
      }

      variant = {
        kind: "print",
        printSizeKey: size.key,
      };
    } else {
      variant = { kind: "download" };
    }

    const unitAmount = getVariantUnitPriceCents(variant);
    const variantLabel =
      variant.kind === "print"
        ? `Print (${getPrintSizeByKey(variant.printSizeKey)?.label ?? "Custom"})`
        : "Original Download";

    lineItems.push({
      quantity: Math.max(1, Math.min(20, item.quantity)),
      price_data: {
        currency: "gbp",
        unit_amount: unitAmount,
        product_data: {
          name: `${product.title} - ${variantLabel}`,
          description: `${product.artist} • ${product.category}`,
          metadata: {
            product_id: product.id,
            purchase_type: variant.kind,
            print_size_key:
              variant.kind === "print" ? variant.printSizeKey : "none",
            preview_path: product.image,
            download_key: product.downloadKey,
          },
        },
      },
    });
  }

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No valid products found" },
      { status: 400 },
    );
  }

  const stripe = new Stripe(stripeKey);
  const hasPrintItems = lineItems.some(
    (line) =>
      line.price_data?.product_data?.metadata?.purchase_type === "print",
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    shipping_address_collection: hasPrintItems
      ? {
          allowed_countries: ["GB", "US", "IE", "FR", "DE", "ES", "IT"],
        }
      : undefined,
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}`,
  });

  return NextResponse.json({ url: session.url });
}
