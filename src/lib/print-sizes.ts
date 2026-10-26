export type PrintSizeName = "A5" | "A4" | "A3" | "A2";

export type PrintSize = {
  name: PrintSizeName;
  /** Paper size in millimetres, portrait. */
  widthMm: number;
  heightMm: number;
  /**
   * Standard price in pence, VAT inclusive. New and imported products start
   * with these; each product's own prices (admin-editable) are what's charged.
   */
  standardPrice: number;
};

export const PRINT_SIZES: PrintSize[] = [
  { name: "A5", widthMm: 148, heightMm: 210, standardPrice: 899 },
  { name: "A4", widthMm: 210, heightMm: 297, standardPrice: 1299 },
  { name: "A3", widthMm: 297, heightMm: 420, standardPrice: 1899 },
  { name: "A2", widthMm: 420, heightMm: 594, standardPrice: 2999 },
];

export function getPrintSize(name: string): PrintSize | undefined {
  return PRINT_SIZES.find((size) => size.name === name);
}

/** The standard price for every size, keyed by size name. */
export function standardPrices(): Record<PrintSizeName, number> {
  return Object.fromEntries(
    PRINT_SIZES.map((size) => [size.name, size.standardPrice]),
  ) as Record<PrintSizeName, number>;
}

/**
 * theprintspace's standard inch sizes on Fuji Crystal Archive, chosen from a
 * drop-down. One price per size for every print (not set per product).
 */
export type FujiSize = {
  /** Stored in carts and orders, e.g. "8x10in". */
  name: string;
  /** Shown to customers, e.g. "8 × 10 in". */
  label: string;
  /** Paper size in millimetres, portrait. */
  widthMm: number;
  heightMm: number;
  /** Pence, VAT inclusive. */
  price: number;
};

/**
 * Our price from theprintspace's dropship cost (lab price + 20%, incl. VAT):
 * half as much again, rounded up to the next £x.99, to cover delivery
 * (free to the customer) and a margin. Lab prices checked 19 October 2026.
 */
const priceFromLab = (labPence: number) =>
  Math.ceil((Math.round(labPence * 1.2) * 1.5) / 100) * 100 - 1;

const inches = (w: number, h: number, lab: number): FujiSize => ({
  name: `${w}x${h}in`,
  label: `${w} × ${h} in`,
  widthMm: w * 25.4,
  heightMm: h * 25.4,
  price: priceFromLab(lab),
});

export const FUJI_SIZES: FujiSize[] = [
  inches(4, 6, 371),
  inches(5, 7, 472),
  inches(8, 10, 835),
  inches(10, 12, 1016),
  inches(11, 14, 1102),
  inches(12, 16, 1196),
  inches(16, 20, 2024),
  inches(20, 24, 2946),
  inches(20, 30, 3678),
  inches(30, 30, 5513),
  inches(30, 40, 7346),
  inches(40, 40, 8316),
  inches(40, 50, 11088),
  inches(40, 60, 12475),
  inches(50, 50, 12475),
  inches(50, 60, 14552),
  inches(50, 75, 16632),
];

export function isFujiSize(format: Format): format is FujiSize {
  return "price" in format && "widthMm" in format;
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

export function getFormat(name: string): Format | undefined {
  if (name === DIGITAL_DOWNLOAD.name) return DIGITAL_DOWNLOAD;
  return getPrintSize(name) ?? FUJI_SIZES.find((size) => size.name === name);
}

/** What a product costs in a format, in pence (VAT inclusive). */
export function priceOf(
  prices: Record<PrintSizeName, number>,
  format: Format,
): number {
  if (isDigital(format)) return DIGITAL_DOWNLOAD.price;
  return isFujiSize(format) ? format.price : prices[format.name];
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
