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
