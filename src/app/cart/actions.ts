"use server";

import {
  MAX_LINES,
  MAX_QUANTITY,
  readCartEntries,
  writeCartEntries,
} from "@/lib/cart";
import { DIGITAL_DOWNLOAD, getFormat } from "@/lib/print-sizes";
import { getProductById } from "@/lib/products";

export type CartActionResult = { ok: true } | { ok: false; error: string };

// Server Actions are public endpoints: every argument is checked here,
// and prices are never accepted from the client.

async function validate(productId: unknown, size: unknown) {
  if (typeof productId !== "string" || typeof size !== "string") {
    return "Invalid request.";
  }
  if (!getFormat(size)) return "That size isn't available.";
  if (!(await getProductById(productId))?.available) {
    return "That print is no longer available.";
  }
  return null;
}

export async function addToCart(
  productId: string,
  size: string,
): Promise<CartActionResult> {
  const error = await validate(productId, size);
  if (error) return { ok: false, error };

  const entries = await readCartEntries();
  const existing = entries.find(
    (e) => e.productId === productId && e.size === size,
  );
  if (existing) {
    if (size === DIGITAL_DOWNLOAD.name) {
      return { ok: false, error: "The download is already in your cart." };
    }
    if (existing.quantity >= MAX_QUANTITY) {
      return {
        ok: false,
        error: `You can order up to ${MAX_QUANTITY} of each print and size.`,
      };
    }
    existing.quantity += 1;
  } else {
    if (entries.length >= MAX_LINES) {
      return { ok: false, error: "Your cart is full." };
    }
    entries.push({ productId, size, quantity: 1 });
  }

  await writeCartEntries(entries);
  return { ok: true };
}

export async function updateQuantity(
  productId: string,
  size: string,
  quantity: number,
) {
  if (typeof quantity !== "number" || !Number.isInteger(quantity)) return;
  const entries = await readCartEntries();
  const index = entries.findIndex(
    (e) => e.productId === productId && e.size === size,
  );
  if (index === -1) return;

  if (quantity <= 0) {
    entries.splice(index, 1);
  } else {
    if ((await validate(productId, size)) !== null) {
      entries.splice(index, 1);
    } else {
      entries[index].quantity = Math.min(
        quantity,
        size === DIGITAL_DOWNLOAD.name ? 1 : MAX_QUANTITY,
      );
    }
  }
  await writeCartEntries(entries);
}

export async function removeFromCart(productId: string, size: string) {
  const entries = await readCartEntries();
  await writeCartEntries(
    entries.filter((e) => !(e.productId === productId && e.size === size)),
  );
}

export type AddToCartFormResult = CartActionResult & { size: string };

/** Form version of addToCart for useActionState (works before hydration). */
export async function addToCartForm(
  _previous: AddToCartFormResult | null,
  formData: FormData,
): Promise<AddToCartFormResult> {
  const productId = formData.get("productId");
  const size = formData.get("size");
  if (typeof productId !== "string" || typeof size !== "string") {
    return { ok: false, error: "Invalid request.", size: "" };
  }
  return { ...(await addToCart(productId, size)), size };
}
