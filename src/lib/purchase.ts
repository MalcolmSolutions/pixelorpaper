import type { Product } from "@/types/product";

export const printSizes = [
  { key: "size_10x8", label: '10" x 8"', priceCents: 1820 },
  { key: "size_16x12", label: '16" x 12"', priceCents: 2214 },
  { key: "size_20x16", label: '20" x 16"', priceCents: 2562 },
  { key: "size_30x20", label: '30" x 20"', priceCents: 3618 },
  { key: "size_A6", label: "A6", priceCents: 1620 },
  { key: "size_A5", label: "A5", priceCents: 1720 },
  { key: "size_A4", label: "A4", priceCents: 2028 },
  { key: "size_A3", label: "A3", priceCents: 2214 },
  { key: "size_A2", label: "A2", priceCents: 2912 },
  { key: "size_A1", label: "A1", priceCents: 4520 },
  { key: "size_A0", label: "A0", priceCents: 7520 },
] as const;

export type PrintSize = (typeof printSizes)[number];
export type PrintSizeKey = PrintSize["key"];

export type PurchaseVariant =
  | {
      kind: "print";
      printSizeKey: PrintSizeKey;
    }
  | {
      kind: "download";
    };

export function getPrintSizeByKey(key: string): PrintSize | undefined {
  return printSizes.find((size) => size.key === key);
}

export function getDownloadPriceCents(): number {
  const raw = Number.parseInt(
    process.env.NEXT_PUBLIC_DOWNLOAD_PRICE_CENTS ?? "600",
    10,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 600;
}

export function getVariantUnitPriceCents(variant: PurchaseVariant): number {
  if (variant.kind === "download") {
    return getDownloadPriceCents();
  }

  return (
    getPrintSizeByKey(variant.printSizeKey)?.priceCents ??
    printSizes[0].priceCents
  );
}

export function getVariantLabel(variant: PurchaseVariant): string {
  if (variant.kind === "download") {
    return "Original Download";
  }

  const size = getPrintSizeByKey(variant.printSizeKey);
  return `Print (${size?.label ?? "Custom"})`;
}

export function getLineId(product: Product, variant: PurchaseVariant): string {
  if (variant.kind === "download") {
    return `${product.id}::download`;
  }

  return `${product.id}::print::${variant.printSizeKey}`;
}
