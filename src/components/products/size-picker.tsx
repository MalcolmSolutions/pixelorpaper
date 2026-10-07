"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addToCartForm } from "@/app/cart/actions";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/print-sizes";
import { formatPrice } from "@/lib/utils";

/**
 * Print size options with the selected size's price and the cart button.
 * Prices are for display; the server prices the cart itself.
 */
export function SizePicker({
  productId,
  prices,
}: {
  productId: string;
  prices: Record<PrintSizeName, number>;
}) {
  const [selected, setSelected] = useState(PRINT_SIZES[1]);
  const [result, formAction, pending] = useActionState(addToCartForm, null);
  // The result only describes the size that was submitted.
  const showResult = !pending && result?.size === selected.name;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="size" value={selected.name} />

      <p className="text-lg tabular-nums">
        {formatPrice(prices[selected.name])}{" "}
        <span className="text-sm text-ink-muted">incl. VAT</span>
      </p>

      <div className="space-y-3">
        <p className="eyebrow">
          Size: <span className="text-ink">{selected.name}</span>{" "}
          <span className="normal-case tracking-normal">
            ({selected.widthMm / 10} × {selected.heightMm / 10} cm)
          </span>
        </p>
        <div role="group" aria-label="Size" className="grid grid-cols-4 gap-2">
          {PRINT_SIZES.map((size) => (
            <button
              key={size.name}
              type="button"
              aria-pressed={selected.name === size.name}
              onClick={() => setSelected(size)}
              className="chip flex-col justify-center gap-0.5 px-2 py-2"
            >
              <span className="font-medium">{size.name}</span>
              <span className="text-xs tabular-nums">
                {formatPrice(prices[size.name])}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? "Adding…" : "Add to cart"}
        </button>
        <p aria-live="polite" className="min-h-5 text-sm">
          {showResult && result?.ok && (
            <>
              Added to your cart.{" "}
              <Link href="/cart" className="link">
                View cart
              </Link>
            </>
          )}
          {showResult && result && !result.ok && (
            <span className="text-ink-muted">{result.error}</span>
          )}
        </p>
      </div>
    </form>
  );
}
