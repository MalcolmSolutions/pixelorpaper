"use client";

import { useState } from "react";
import { PRINT_SIZES } from "@/lib/print-sizes";
import { formatPrice } from "@/lib/utils";

/** Print size options with the selected size's price and the cart button. */
export function SizePicker() {
  const [selected, setSelected] = useState(PRINT_SIZES[1]);

  return (
    <div className="space-y-6">
      <p className="text-lg tabular-nums">
        {formatPrice(selected.price)}{" "}
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
                {formatPrice(size.price)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn-primary btn-block" disabled>
        Add to cart
      </button>
    </div>
  );
}
