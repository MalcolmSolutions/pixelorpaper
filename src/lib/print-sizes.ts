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
export type Format = PrintSize | DigitalDownload;
export type FormatName = Format["name"];

export function isDigital(format: Format): format is DigitalDownload {
  return format.name === DIGITAL_DOWNLOAD.name;
}

export function getFormat(name: string): Format | undefined {
  return name === DIGITAL_DOWNLOAD.name ? DIGITAL_DOWNLOAD : getPrintSize(name);
}

/** What a product costs in a format, in pence (VAT inclusive). */
export function priceOf(
  prices: Record<PrintSizeName, number>,
  format: Format,
): number {
  return isDigital(format) ? DIGITAL_DOWNLOAD.price : prices[format.name];
}

/** "A4 · 21 × 29.7 cm" or "Digital download · 6000 × 3376 px". */
export function describeFormat(
  format: Format,
  image: { width: number; height: number },
): string {
  return isDigital(format)
    ? `${format.label} · ${image.width} × ${image.height} px`
    : `${format.name} · ${format.widthMm / 10} × ${format.heightMm / 10} cm`;
}
