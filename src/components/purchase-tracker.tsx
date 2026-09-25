"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/components/analytics";

interface PurchaseTrackingProps {
  sessionId?: string;
  items: Array<{ item_name: string; quantity: number }>;
  total: number;
}

export function PurchaseTracker({
  sessionId,
  items,
  total,
}: PurchaseTrackingProps) {
  useEffect(() => {
    if (sessionId && items.length > 0) {
      const formattedItems = items.map((item, idx) => ({
        id: `item-${idx}`,
        name: item.item_name,
        price: 0,
        quantity: item.quantity,
      }));
      trackPurchase(sessionId, formattedItems, total);
    }
  }, [sessionId, items, total]);

  return null;
}
