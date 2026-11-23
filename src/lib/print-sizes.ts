export type PrintSizeName = "A5" | "A4" | "A3" | "A2";

// Pricing. The shop adds nothing on top of what customers see here.
// Every amount from theprintspace below is what they actually bill us
// (their price list, checked 26 October 2026), in pence.

/** Our fee for the image itself: the download price, and part of every print. */
export const IMAGE_FEE = 500;

/** Profit added on top of a print's cost and the image fee. */
export const PROFIT_RATE = 0.3;

/**
 * A print's price from what theprintspace bills for it: their print cost
 * plus the image fee, plus 30% profit, rounded up to the next £x.99.
 * Delivery is charged separately, once per order.
 */
export function priceFromCost(printCost: number) {
  // To a hundredth of a penny first, so float error can't push it up a pound.
  const pence =
    Math.round((printCost + IMAGE_FEE) * (1 + PROFIT_RATE) * 100) / 100;
  return Math.ceil((pence + 1) / 100) * 100 - 1;
}

/**
 * UK delivery, charged once per order with prints, at what theprintspace
 * bills for dropshipping unframed prints of any size. Pence.
 */
export const DELIVERY_PRICE = 774;

export type PrintSize = {
  name: PrintSizeName;
  /** Paper size in millimetres, portrait. */
  widthMm: number;
  heightMm: number;
  /** What theprintspace bills for the print, in pence. */
  cost: number;
  /** Our price in pence; the same for every print. */
  price: number;
};

const aSize = (
  name: PrintSizeName,
  widthMm: number,
  heightMm: number,
  cost: number,
): PrintSize => ({ name, widthMm, heightMm, cost, price: priceFromCost(cost) });

export const PRINT_SIZES: PrintSize[] = [
  aSize("A5", 148, 210, 662.4),
  aSize("A4", 210, 297, 1162.08),
  aSize("A3", 297, 420, 1435.68),
  aSize("A2", 420, 594, 2874.24),
];

export function getPrintSize(name: string): PrintSize | undefined {
  return PRINT_SIZES.find((size) => size.name === name);
}

/**
 * theprintspace's standard inch sizes on Fuji Crystal Archive, chosen from a
 * drop-down. Priced the same way as the A sizes.
 */
export type FujiSize = {
  /** Stored in carts and orders, e.g. "8x10in". */
  name: string;
  /** Shown to customers, e.g. "8 × 10 in". */
  label: string;
  /** Paper size in millimetres, portrait. */
  widthMm: number;
  heightMm: number;
  /** What theprintspace bills for the print, in pence. */
  cost: number;
  /** Our price in pence. */
  price: number;
};

const inches = (w: number, h: number, cost: number): FujiSize => ({
  name: `${w}x${h}in`,
  label: `${w} × ${h} in`,
  widthMm: w * 25.4,
  heightMm: h * 25.4,
  cost,
  price: priceFromCost(cost),
});

export const FUJI_SIZES: FujiSize[] = [
  inches(4, 6, 444.96),
  inches(5, 7, 565.92),
  inches(8, 10, 1002.24),
  inches(10, 12, 1219.68),
  inches(11, 14, 1321.92),
  inches(12, 16, 1435.68),
  inches(16, 20, 2429.28),
  inches(20, 24, 3535.2),
  inches(20, 30, 4413.6),
  inches(30, 30, 6615.36),
  inches(30, 40, 8815.68),
  inches(40, 40, 9979.2),
  inches(40, 50, 13305.6),
  inches(40, 60, 14970.24),
  inches(50, 50, 14970.24),
  inches(50, 60, 17462.88),
  inches(50, 75, 19958.4),
];

export function isFujiSize(format: Format): format is FujiSize {
  return "label" in format && "widthMm" in format;
}

/**
 * The full-resolution image file, sold as a download. One price for every
 * print (not set per product), and at most one per order line.
 */
export const DIGITAL_DOWNLOAD = {
  name: "DIGITAL",
  label: "Digital download",
  price: IMAGE_FEE,
} as const;

export type DigitalDownload = typeof DIGITAL_DOWNLOAD;

/** Anything a print can be bought as: a printed size or the download. */
export type Format = PrintSize | FujiSize | DigitalDownload;
export type FormatName = Format["name"];

export function isDigital(format: Format): format is DigitalDownload {
  return format.name === DIGITAL_DOWNLOAD.name;
}

/** Delivery for an order of these formats: one flat charge if any are prints. */
export function deliveryFor(formats: Format[]): number {
  return formats.some((format) => !isDigital(format)) ? DELIVERY_PRICE : 0;
}

export function getFormat(name: string): Format | undefined {
  if (name === DIGITAL_DOWNLOAD.name) return DIGITAL_DOWNLOAD;
  return getPrintSize(name) ?? FUJI_SIZES.find((size) => size.name === name);
}

/** "A4", "8 × 10 in" or "Digital download". */
export function formatLabel(format: Format): string {
  return isDigital(format) || isFujiSize(format) ? format.label : format.name;
}

/** The label for a size stored on an order line, e.g. "8 × 10 in". */
export function sizeLabel(name: string): string {
  const format = getFormat(name);
  return format ? formatLabel(format) : name;
}

const cm = (mm: number) => Math.round(mm) / 10;

/** "A4 · 21 × 29.7 cm" or "Digital download · 6000 × 3376 px". */
export function describeFormat(
  format: Format,
  image: { width: number; height: number },
): string {
  return isDigital(format)
    ? `${format.label} · ${image.width} × ${image.height} px`
    : `${formatLabel(format)} · ${cm(format.widthMm)} × ${cm(format.heightMm)} cm`;
}
