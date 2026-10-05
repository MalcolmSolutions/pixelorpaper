"use client";

import { useEffect } from "react";
import { clearOrderedItems } from "@/app/checkout/actions";

/** Removes a placed order's prints from the cart once, after the page loads. */
export function ClearOrderedItems({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    void clearOrderedItems(sessionId);
  }, [sessionId]);
  return null;
}
