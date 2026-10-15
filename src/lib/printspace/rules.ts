import { PRINT_SIZES, type PrintSizeName } from "@/lib/print-sizes";

// Pure rules for print fulfilment through theprintspace, kept apart from the
// API and database code so they can be unit tested.

/**
 * off: nothing is queued or sent (the feature is switched off).
 * quote: jobs are set up and priced at theprintspace, but never placed.
 * live: orders are placed, printed and billed.
 */
export type FulfilmentMode = "off" | "quote" | "live";

/**
 * The mode from its setting. Live only takes effect on the live site
 * (`siteUrl`), so staging or a dev machine can never place real orders.
 */
export function fulfilmentMode(
  value: string | undefined,
  siteUrl: string | undefined,
): FulfilmentMode {
  if (value === "live") {
    return siteUrl?.replace(/\/$/, "") === LIVE_SITE ? "live" : "quote";
  }
  return value === "quote" ? value : "off";
}

const LIVE_SITE = "https://pixelorpaper.co.uk";

/** Every print is Fuji Crystal Archive Matt (C-type), unframed. */
export const PAPER_ID = "fuji-matt";
/**
 * No added border. theprintspace fits the whole image to the paper without
 * cropping, so a photo that isn't A-shaped gets white space on two edges.
 */
export const BORDER = "none";

export type VariantSpec = {
  size_label: PrintSizeName;
  print_width_mm: number;
  print_height_mm: number;
  price_gbp: number;
  is_framed: false;
  mount_board_size: "none";
  border: typeof BORDER;
  paper_id: typeof PAPER_ID;
};

/**
 * The full set of variants for a print (theprintspace replaces the whole
 * set on each PUT): every A size, turned to the image's orientation, priced
 * at what we charge.
 */
export function variantSpecs(
  image: { width: number; height: number },
  prices: Record<PrintSizeName, number>,
): VariantSpec[] {
  const landscape = image.width > image.height;
  return PRINT_SIZES.map((size) => ({
    size_label: size.name,
    print_width_mm: landscape ? size.heightMm : size.widthMm,
    print_height_mm: landscape ? size.widthMm : size.heightMm,
    price_gbp: prices[size.name] / 100,
    is_framed: false,
    mount_board_size: "none",
    border: BORDER,
    paper_id: PAPER_ID,
  }));
}

/** theprintspace reports money in pounds; we keep integer pence. */
export const penceFromPounds = (pounds: number) => Math.round(pounds * 100);

/**
 * Whether an upload at creativehub is the artwork for one of our images:
 * the same file name, ignoring folders, case and the extension.
 */
export function isUploadFor(uploadName: string, imageKey: string): boolean {
  const stem = (name: string) =>
    name
      .split(/[\\/]/)
      .pop()!
      .replace(/\.(jpe?g|png|tiff?)$/i, "")
      .trim()
      .toLowerCase();
  return stem(uploadName) !== "" && stem(uploadName) === stem(imageKey);
}

export type DeliveryFields = {
  delivery_name: string;
  delivery_line1: string;
  delivery_line2?: string;
  delivery_city: string;
  delivery_county?: string;
  delivery_postcode?: string;
  delivery_country_code: string;
  delivery_email?: string;
};

/**
 * theprintspace's delivery fields from the shipping details Stripe Checkout
 * collected (stored as JSON on the order). Null if anything required is
 * missing, so the job is held rather than sent to a bad address.
 */
export function deliveryFields(
  shippingJson: string | null,
  email: string | null,
): DeliveryFields | null {
  if (!shippingJson) return null;
  let shipping: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  };
  try {
    shipping = JSON.parse(shippingJson);
  } catch {
    return null;
  }
  const address = shipping.address;
  const name = shipping.name?.trim();
  const line1 = address?.line1?.trim();
  const city = address?.city?.trim();
  const country = address?.country?.trim();
  if (!name || !line1 || !city || !country) return null;
  return {
    delivery_name: name,
    delivery_line1: line1,
    ...(address?.line2?.trim() && { delivery_line2: address.line2.trim() }),
    delivery_city: city,
    ...(address?.state?.trim() && { delivery_county: address.state.trim() }),
    ...(address?.postal_code?.trim() && {
      delivery_postcode: address.postal_code.trim(),
    }),
    delivery_country_code: country,
    ...(email && { delivery_email: email }),
  };
}

/**
 * The cost check: theprintspace's price for the prints must be less than
 * what the customer paid for them, or the job is held for the admin.
 */
export function passesCostCheck(
  quotedCostPence: number,
  printRevenuePence: number,
): boolean {
  return quotedCostPence < printRevenuePence;
}

/**
 * Our job status for an order status reported by theprintspace. Their exact
 * strings aren't documented yet, so this matches on the words in them and
 * otherwise leaves the job as submitted (the raw status is kept and shown).
 */
export function jobStatusFor(
  chStatus: string | null | undefined,
): "submitted" | "dispatched" | "cancelled" {
  const status = (chStatus ?? "").toLowerCase();
  // Not "complete": that may only mean printing has finished.
  if (/dispatch|despatch|shipped|delivered/.test(status)) {
    return "dispatched";
  }
  if (/cancel|refund/.test(status)) return "cancelled";
  return "submitted";
}
