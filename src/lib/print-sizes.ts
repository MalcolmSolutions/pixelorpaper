export type PrintSizeName = "A5" | "A4" | "A3" | "A2";

/** VAT rate on everything we sell (UK standard rate). */
export const VAT_RATE = 0.2;

/**
 * Our price from theprintspace's dropship cost for a Fuji Crystal Archive
 * print (pence, excl. VAT): half as much again, plus VAT, rounded up to the
 * next £x.99.
 */
export function priceFromCost(dropshipExVat: number) {
  // To a hundredth of a penny first, so float error can't push it up a pound.
  const pence = Math.round(dropshipExVat * 1.5 * (1 + VAT_RATE) * 100) / 100;
  return Math.ceil((pence + 1) / 100) * 100 - 1;
}

/**
 * UK delivery, charged once per order with prints: theprintspace's flat
 * dropship rate for unframed prints of any size (£6.45 excl. VAT, checked
 * 26 October 2026), plus VAT. Pence.
 */
export const DELIVERY_PRICE = Math.round(645 * (1 + VAT_RATE));

/** The VAT included in a VAT-inclusive price, in pence. */
export const vatIn = (pence: number) =>
  Math.round((pence * VAT_RATE) / (1 + VAT_RATE));

export type PrintSize = {
  name: PrintSizeName;
  /** Paper size in millimetres, portrait. */
  widthMm: number;
  heightMm: number;
  /**
   * theprintspace's dropship price for the print, in pence excl. VAT, from
   * their price list (checked 26 October 2026).
   */
  cost: number;
  /** Pence, VAT inclusive; the same for every print. */
  price: number;
};

const aSize = (
  name: PrintSizeName,
  widthMm: number,
  heightMm: number,
  cost: number,
): PrintSize => ({ name, widthMm, heightMm, cost, price: priceFromCost(cost) });

export const PRINT_SIZES: PrintSize[] = [
  aSize("A5", 148, 210, 552),
  aSize("A4", 210, 297, 968.4),
  aSize("A3", 297, 420, 1196.4),
  aSize("A2", 420, 594, 2395.2),
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
  /** theprintspace's dropship price, pence excl. VAT. */
  cost: number;
  /** Pence, VAT inclusive. */
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
  inches(4, 6, 370.8),
  inches(5, 7, 471.6),
  inches(8, 10, 835.2),
  inches(10, 12, 1016.4),
  inches(11, 14, 1101.6),
  inches(12, 16, 1196.4),
  inches(16, 20, 2024.4),
  inches(20, 24, 2946),
  inches(20, 30, 3678),
  inches(30, 30, 5512.8),
  inches(30, 40, 7346.4),
  inches(40, 40, 8316),
  inches(40, 50, 11088),
  inches(40, 60, 12475.2),
  inches(50, 50, 12475.2),
  inches(50, 60, 14552.4),
  inches(50, 75, 16632),
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
  price: 500,
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
