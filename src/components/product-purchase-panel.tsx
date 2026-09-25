"use client";

import { useState } from "react";
import { useCart } from "@/context/cart-context";
import { trackAddToCart } from "./analytics";
import {
  getDownloadPriceCents,
  printSizes,
  type PrintSizeKey,
} from "@/lib/purchase";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/product";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const [selectedPrintSize, setSelectedPrintSize] = useState<PrintSizeKey>(
    printSizes[0].key,
  );
  const { addPrintToCart, addDownloadToCart } = useCart();
  const downloadPriceCents = getDownloadPriceCents();

  const handleAddDownload = () => {
    addDownloadToCart(product);
    trackAddToCart(product.id, product.title, downloadPriceCents);
  };

  const handleAddPrint = () => {
    const selectedSize = printSizes.find((s) => s.key === selectedPrintSize);
    const priceCents = selectedSize?.priceCents ?? product.priceCents;
    addPrintToCart(product, selectedPrintSize);
    trackAddToCart(product.id, product.title, priceCents);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <h2 className="mb-3 text-lg font-bold text-zinc-900">Order Options</h2>
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-700">
        <span>Original download</span>
        <strong className="text-zinc-900">
          {formatPrice(downloadPriceCents)}
        </strong>
      </div>

      <label
        htmlFor="product-size"
        className="mb-2 block text-sm text-zinc-700"
      >
        Printed image size
      </label>
      <select
        id="product-size"
        value={selectedPrintSize}
        onChange={(event) =>
          setSelectedPrintSize(event.target.value as PrintSizeKey)
        }
        className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      >
        {printSizes.map((size) => (
          <option key={size.key} value={size.key}>
            {size.label} - {formatPrice(size.priceCents)}
          </option>
        ))}
      </select>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAddDownload}
          className="rounded-full border border-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-900 hover:text-orange-50"
        >
          Add download
        </button>
        <button
          type="button"
          onClick={handleAddPrint}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-orange-50 transition hover:bg-zinc-700"
        >
          Add print
        </button>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Printed orders are sent to production after payment. Download files are
        delivered after successful payment.
      </p>
    </div>
  );
}
