import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client, resolveR2Config } from "@/lib/r2";
import { SuccessContent } from "@/components/checkout-success-content";
import { retrievePaidCheckoutSession } from "@/lib/stripe-sessions";

// Note: R2 operations are optional; will gracefully handle if unavailable
export const runtime = "edge";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

type DownloadLink = {
  name: string;
  url: string;
  quantity: number;
};

type PrintItem = {
  productName: string;
  quantity: number;
  printSizeKey: string;
};

async function getDownloadLinks(
  session: Awaited<ReturnType<typeof retrievePaidCheckoutSession>>,
): Promise<DownloadLink[]> {
  const client = createR2Client();
  const r2 = resolveR2Config();

  if (!session || !client || !r2) {
    return [];
  }

  const lineItems = session.line_items?.data ?? [];
  const ttl = Number.parseInt(
    process.env.DOWNLOAD_LINK_TTL_SECONDS ?? "86400",
    10,
  );
  const expiresIn = Number.isFinite(ttl) && ttl > 0 ? ttl : 86400;
  const links: DownloadLink[] = [];

  for (const item of lineItems) {
    const product = item.price?.product;
    if (!product || typeof product === "string") {
      continue;
    }

    if ("deleted" in product) {
      continue;
    }

    if (product.metadata.purchase_type !== "download") {
      continue;
    }

    const key =
      product.metadata.download_key?.replace(/^\/+/, "") ??
      product.metadata.image_path?.replace(/^\/+/, "");
    if (!key) {
      continue;
    }

    const signedUrl = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: r2.bucket,
        Key: decodeURIComponent(key),
      }),
      { expiresIn },
    );

    links.push({
      name: product.name,
      url: signedUrl,
      quantity: item.quantity ?? 1,
    });
  }

  return links;
}

async function getPrintItems(
  session: Awaited<ReturnType<typeof retrievePaidCheckoutSession>>,
): Promise<PrintItem[]> {
  if (!session) {
    return [];
  }

  const lineItems = session.line_items?.data ?? [];
  const items: PrintItem[] = [];

  for (const item of lineItems) {
    const product = item.price?.product;
    if (!product || typeof product === "string") {
      continue;
    }

    if ("deleted" in product) {
      continue;
    }

    if (product.metadata.purchase_type !== "print") {
      continue;
    }

    items.push({
      productName: product.name,
      quantity: item.quantity ?? 1,
      printSizeKey: product.metadata.print_size_key ?? "unknown",
    });
  }

  return items;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const session = sessionId
    ? await retrievePaidCheckoutSession(sessionId)
    : null;
  const downloads = await getDownloadLinks(session);
  const printItems = await getPrintItems(session);

  return (
    <SuccessContent
      sessionId={sessionId}
      downloads={downloads}
      printItems={printItems}
    />
  );
}
