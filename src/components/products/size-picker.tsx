"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addToCartForm } from "@/app/cart/actions";
import { inputClass } from "@/components/admin/field";
import {
  DIGITAL_DOWNLOAD,
  formatLabel,
  FUJI_SIZES,
  getFormat,
  isDigital,
  isFujiSize,
  priceOf,
  PRINT_SIZES,
  type Format,
  type PrintSizeName,
} from "@/lib/print-sizes";
import { formatPrice } from "@/lib/utils";

/**
 * Print sizes and the digital download, with the selected option's price
 * and the cart button. Prices are for display; the server prices the cart.
 * The A sizes are buttons; the inch sizes on Fuji paper are in a drop-down.
 */
export function SizePicker({
  productId,
  prices,
  image,
  initialSize = PRINT_SIZES[1],
}: {
  productId: string;
  prices: Record<PrintSizeName, number>;
  /** Full-resolution size of the original, as sold in the download. */
  image: { width: number; height: number };
  /** Selected at first: A4, or the size a link asked for (?size=A3). */
  initialSize?: Format;
}) {
  const [selected, setSelected] = useState<Format>(initialSize);
  const [result, formAction, pending] = useActionState(addToCartForm, null);
  // The result only describes the size that was submitted.
  const showResult = !pending && result?.size === selected.name;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="size" value={selected.name} />

      <p className="text-lg tabular-nums">
        {formatPrice(priceOf(prices, selected))}{" "}
        <span className="text-sm text-ink-muted">incl. VAT</span>
      </p>

      <div className="space-y-3">
        <p className="eyebrow">
          {isDigital(selected) ? (
            <>
              Format: <span className="text-ink">{selected.label}</span>{" "}
              <span className="normal-case tracking-normal">
                ({image.width} × {image.height} px)
              </span>
            </>
          ) : (
            <>
              Size:{" "}
              <span className="text-ink normal-case">
                {formatLabel(selected)}
              </span>{" "}
              <span className="normal-case tracking-normal">
                ({Math.round(selected.widthMm) / 10} ×{" "}
                {Math.round(selected.heightMm) / 10} cm)
              </span>
            </>
          )}
        </p>
        <div
          role="group"
          aria-label="Size or format"
          className="grid grid-cols-4 gap-2"
        >
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
          <button
            type="button"
            aria-pressed={isDigital(selected)}
            onClick={() => setSelected(DIGITAL_DOWNLOAD)}
            className="chip col-span-4 justify-between gap-3 px-4 py-2"
          >
            <span className="font-medium">{DIGITAL_DOWNLOAD.label}</span>
            <span className="text-xs tabular-nums">
              {formatPrice(DIGITAL_DOWNLOAD.price)}
            </span>
          </button>
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-ink-muted">
            More sizes on Fuji Crystal Archive paper
          </span>
          <span className="relative block">
            <select
              value={isFujiSize(selected) ? selected.name : ""}
              onChange={(e) => {
                const format = getFormat(e.target.value);
                if (format) setSelected(format);
              }}
              className={`${inputClass} cursor-pointer appearance-none pr-10 tabular-nums`}
            >
              <option value="" disabled>
                Choose another size…
              </option>
              {FUJI_SIZES.map((size) => (
                <option key={size.name} value={size.name}>
                  {size.label} · {formatPrice(size.price)}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 10 6"
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-4 w-2.5 -translate-y-1/2"
            >
              <path
                d="M1 1l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </span>
        </label>
        {isDigital(selected) && (
          <p className="text-sm text-ink-muted">
            The full-resolution image file, to download as soon as payment
            clears. Available to UK customers only. For personal use; no resale
            or redistribution.
          </p>
        )}
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
