import { cookies } from "next/headers";
import { getPrintSize, type PrintSize } from "@/lib/print-sizes";
import { getProductById } from "@/lib/products";
import type { Product } from "@/types/product";

// The cart lives in one httpOnly cookie holding [productId, size, quantity]
// tuples. Prices are never stored: every read prices lines from the current
// print sizes, and every entry is re-validated against the catalog.

const CART_COOKIE = "cart";
export const MAX_QUANTITY = 10;
export const MAX_LINES = 40;

export type CartEntry = { productId: string; size: string; quantity: number };

export type CartLine = {
  product: Product;
  size: PrintSize;
  quantity: number;
  /** Pence, VAT inclusive. */
  unitPrice: number;
  lineTotal: number;
};

export type Cart = {
  lines: CartLine[];
  /** Pence, VAT inclusive. */
  subtotal: number;
  itemCount: number;
  /** Lines dropped because the print or size is no longer available. */
  removedCount: number;
};

function clampQuantity(value: number) {
  return Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(value)));
}

/** Cart entries from the cookie. Malformed data is ignored, never trusted. */
export async function readCartEntries(): Promise<CartEntry[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const entries: CartEntry[] = [];
  for (const item of parsed) {
    if (
      !Array.isArray(item) ||
      typeof item[0] !== "string" ||
      typeof item[1] !== "string" ||
      typeof item[2] !== "number" ||
      !Number.isFinite(item[2])
    ) {
      continue;
    }
    const quantity = clampQuantity(item[2]);
    if (quantity === 0) continue;

    const existing = entries.find(
      (e) => e.productId === item[0] && e.size === item[1],
    );
    if (existing) {
      existing.quantity = clampQuantity(existing.quantity + quantity);
    } else if (entries.length < MAX_LINES) {
      entries.push({ productId: item[0], size: item[1], quantity });
    }
  }
  return entries;
}

async function isAvailable(entry: CartEntry) {
  return (
    getPrintSize(entry.size) !== undefined &&
    (await getProductById(entry.productId))?.available === true
  );
}

/**
 * Saves the entries, dropping any that are no longer available.
 * Only callable from Server Actions.
 */
export async function writeCartEntries(all: CartEntry[]) {
  const available = await Promise.all(all.map(isAvailable));
  const entries = all.filter((_, i) => available[i]);
  const store = await cookies();
  if (entries.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(
    CART_COOKIE,
    JSON.stringify(entries.map((e) => [e.productId, e.size, e.quantity])),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );
}

/** The cart priced from current product data, without unavailable lines. */
export async function getCart(): Promise<Cart> {
  const entries = await readCartEntries();
  const resolved = await Promise.all(
    entries.map(async (entry) => {
      const size = getPrintSize(entry.size);
      const product = size && (await getProductById(entry.productId));
      if (!size || !product?.available) return undefined;
      const unitPrice = product.prices[size.name];
      return {
        product,
        size,
        quantity: entry.quantity,
        unitPrice,
        lineTotal: unitPrice * entry.quantity,
      } satisfies CartLine;
    }),
  );

  const lines = resolved.filter((line) => line !== undefined);
  return {
    lines,
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    removedCount: entries.length - lines.length,
  };
}
