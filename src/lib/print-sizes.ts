export type PrintSize = {
  name: string;
  /** Paper size in millimetres, portrait. */
  widthMm: number;
  heightMm: number;
  /** Price in pence, VAT inclusive. Every print costs the same per size. */
  price: number;
};

export const PRINT_SIZES: PrintSize[] = [
  { name: "A5", widthMm: 148, heightMm: 210, price: 899 },
  { name: "A4", widthMm: 210, heightMm: 297, price: 1299 },
  { name: "A3", widthMm: 297, heightMm: 420, price: 1899 },
  { name: "A2", widthMm: 420, heightMm: 594, price: 2999 },
];
