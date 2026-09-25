import { getStripeClientEntries } from "@/lib/stripe-sessions";

export const runtime = "edge";

type CsvRow = {
  stripeSessionId: string;
  paidAt: string;
  customerName: string;
  customerEmail: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  productName: string;
  quantity: number;
  printSizeKey: string;
  sourceImageKey: string;
};

function escapeCsv(value: string | number): string {
  const text = String(value ?? "");
  const escaped = text.replaceAll('"', '""');
  return `"${escaped}"`;
}

function toCsv(rows: CsvRow[]): string {
  const headers = [
    "stripe_session_id",
    "paid_at",
    "customer_name",
    "customer_email",
    "shipping_line_1",
    "shipping_line_2",
    "shipping_city",
    "shipping_state",
    "shipping_postal_code",
    "shipping_country",
    "product_name",
    "quantity",
    "print_size_key",
    "source_image_key",
  ];

  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.stripeSessionId,
        row.paidAt,
        row.customerName,
        row.customerEmail,
        row.shippingLine1,
        row.shippingLine2,
        row.shippingCity,
        row.shippingState,
        row.shippingPostalCode,
        row.shippingCountry,
        row.productName,
        row.quantity,
        row.printSizeKey,
        row.sourceImageKey,
      ]
        .map((value) => escapeCsv(value))
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

export async function GET(req: Request) {
  const stripeClients = getStripeClientEntries();
  if (stripeClients.length === 0) {
    return new Response(
      "Missing STRIPE_SECRET_KEY (and optional STRIPE_LEGACY_UNFRAMED_SECRET_KEY)",
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const daysRaw = Number.parseInt(url.searchParams.get("days") ?? "30", 10);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 30;
  const gteTimestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  const rows: CsvRow[] = [];
  const processedSessionIds = new Set<string>();

  for (const { client } of stripeClients) {
    const sessions = await client.checkout.sessions.list({
      limit: 100,
      created: { gte: gteTimestamp },
    });

    for (const session of sessions.data) {
      if (session.payment_status !== "paid") {
        continue;
      }

      if (processedSessionIds.has(session.id)) {
        continue;
      }

      const detailedSession = await client.checkout.sessions.retrieve(
        session.id,
        {
          expand: ["line_items.data.price.product"],
        },
      );

      processedSessionIds.add(detailedSession.id);

      const lineItems = detailedSession.line_items?.data ?? [];
      const address = detailedSession.customer_details?.address;

      for (const line of lineItems) {
        const product = line.price?.product;
        if (!product || typeof product === "string") {
          continue;
        }

        if ("deleted" in product) {
          continue;
        }

        if (product.metadata.purchase_type !== "print") {
          continue;
        }

        rows.push({
          stripeSessionId: detailedSession.id,
          paidAt: new Date((detailedSession.created ?? 0) * 1000).toISOString(),
          customerName: detailedSession.customer_details?.name ?? "",
          customerEmail: detailedSession.customer_details?.email ?? "",
          shippingLine1: address?.line1 ?? "",
          shippingLine2: address?.line2 ?? "",
          shippingCity: address?.city ?? "",
          shippingState: address?.state ?? "",
          shippingPostalCode: address?.postal_code ?? "",
          shippingCountry: address?.country ?? "",
          productName: product.name,
          quantity: line.quantity ?? 1,
          printSizeKey: product.metadata.print_size_key ?? "",
          sourceImageKey: product.metadata.download_key ?? "",
        });
      }
    }
  }

  rows.sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  const csv = toCsv(rows);
  const filename = `digitalab-print-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
