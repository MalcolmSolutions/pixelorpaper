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
 * Every other size theprintspace prints on Fuji Crystal Archive, chosen from
 * a drop-down. One price per size for every print (not set per product).
 */
export type FujiSize = {
  /** Stored in carts and orders, e.g. "A1" or "8x10in". */
  name: string;
  /** Shown to customers, e.g. "A1" or "8 × 10 in". */
  label: string;
  group: (typeof FUJI_GROUPS)[number];
  /** Paper size in millimetres, portrait. */
  widthMm: number;
  heightMm: number;
  /** Pence, VAT inclusive. */
  price: number;
};

export const FUJI_GROUPS = ["A sizes", "Standard", "Panoramic"] as const;

/**
 * Our price from theprintspace's dropship cost (lab price + 20%, incl. VAT):
 * half as much again, rounded up to the next £x.99, to cover delivery
 * (free to the customer) and a margin. Lab prices checked 19 October 2026.
 */
const priceFromLab = (labPence: number) =>
  Math.ceil((Math.round(labPence * 1.2) * 1.5) / 100) * 100 - 1;

const aSize = (name: string, widthMm: number, heightMm: number, lab: number) =>
  ({ name, label: name, group: "A sizes", widthMm, heightMm, price: priceFromLab(lab) }) as const;

const inches = (group: FujiSize["group"], w: number, h: number, lab: number) =>
  ({
    name: `${w}x${h}in`,
    label: `${w} × ${h} in`,
    group,
    widthMm: w * 25.4,
    heightMm: h * 25.4,
    price: priceFromLab(lab),
  }) as const;

export const FUJI_SIZES: FujiSize[] = [
  aSize("A1", 594, 841, 4781),
  aSize("A0", 841, 1189, 8593),
  inches("Standard", 4, 6, 371),
  inches("Standard", 5, 7, 472),
  inches("Standard", 8, 10, 835),
  inches("Standard", 10, 12, 1016),
  inches("Standard", 11, 14, 1102),
  inches("Standard", 12, 16, 1196),
  inches("Standard", 16, 20, 2024),
  inches("Standard", 20, 24, 2946),
  inches("Standard", 20, 30, 3678),
  inches("Standard", 30, 30, 5513),
  inches("Standard", 30, 40, 7346),
  inches("Standard", 40, 40, 8316),
  inches("Standard", 40, 50, 11088),
  inches("Standard", 40, 60, 12475),
  inches("Standard", 50, 50, 12475),
  inches("Standard", 50, 60, 14552),
  inches("Standard", 50, 75, 16632),
  inches("Panoramic", 4, 30, 277),
  inches("Panoramic", 10, 20, 1472),
  inches("Panoramic", 10, 30, 2299),
  inches("Panoramic", 16, 36, 3308),
  inches("Panoramic", 16, 48, 4961),
  inches("Panoramic", 20, 40, 5142),
  inches("Panoramic", 20, 60, 7717),
  inches("Panoramic", 24, 48, 7538),
  inches("Panoramic", 24, 72, 10835),
  inches("Panoramic", 30, 60, 11386),
  inches("Panoramic", 30, 90, 16901),
  inches("Panoramic", 36, 72, 15245),
  inches("Panoramic", 36, 108, 20790),
  inches("Panoramic", 40, 80, 16632),
  inches("Panoramic", 40, 120, 22870),
  inches("Panoramic", 50, 100, 20790),
  inches("Panoramic", 50, 150, 31183),
];

export function isFujiSize(format: Format): format is FujiSize {
  return "group" in format;
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
