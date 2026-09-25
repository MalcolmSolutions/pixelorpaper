"use client";

import { useEffect } from "react";
import { trackProductView } from "@/components/analytics";
import type { Product } from "@/types/product";

export function ProductViewTracker({ product }: { product: Product }) {
  useEffect(() => {
    trackProductView(product.id, product.title, product.priceCents);
  }, [product.id, product.title, product.priceCents]);

  return null;
}
