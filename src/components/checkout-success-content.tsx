"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/cart-context";
import { PurchaseTracker } from "./purchase-tracker";

type PrintItem = {
  productName: string;
  quantity: number;
  printSizeKey: string;
};

type SuccessContentProps = {
  sessionId: string | undefined;
  downloads: Array<{
    name: string;
    url: string;
    quantity: number;
  }>;
  printItems: PrintItem[];
};

export function SuccessContent({
  sessionId,
  downloads,
  printItems,
}: SuccessContentProps) {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Combine all items for analytics tracking
  const allItems = [
    ...downloads.map((d) => ({
      item_name: d.name,
      quantity: d.quantity,
    })),
    ...printItems.map((p) => ({
      item_name: p.productName,
      quantity: p.quantity,
    })),
  ];

  return (
    <>
      <PurchaseTracker sessionId={sessionId} items={allItems} total={0} />
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16 md:px-10">
        <section className="w-full rounded-3xl border border-zinc-200 bg-white/90 p-8 shadow-sm">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-orange-900/70">
            Payment complete
          </p>
          <h1 className="mb-3 text-center text-4xl font-bold text-zinc-900">
            Thank you for your order
          </h1>
          <p className="mb-6 text-center text-zinc-600">
            Printed items will be sent for production and delivery. Download
            links for digital items are shown below.
          </p>

          {printItems.length > 0 && (
            <div className="mb-6 space-y-3 rounded-2xl bg-amber-50 p-4 border border-amber-200">
              <h2 className="text-lg font-semibold text-zinc-900">
                Print Orders (Manual Fulfillment)
              </h2>
              {printItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.productName}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Size: {item.printSizeKey} • Qty: {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-amber-700 mt-3 pt-3 border-t border-amber-200">
                Download all print orders as CSV and upload to Digitalab:
              </p>
              <a
                href="/api/orders/prints/csv"
                download
                className="block text-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 mt-2"
              >
                Download Print Orders CSV
              </a>
            </div>
          )}

          {downloads.length > 0 ? (
            <div className="mb-6 space-y-3 rounded-2xl bg-zinc-50 p-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                Your Downloads
              </h2>
              {downloads.map((download, index) => (
                <div
                  key={`${download.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {download.name}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Quantity: {download.quantity}
                    </p>
                  </div>
                  <a
                    href={download.url}
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-orange-50 transition hover:bg-zinc-700"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          ) : null}

          {downloads.length === 0 && printItems.length === 0 && (
            <p className="mb-6 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
              No items found for this session. If you bought items, refresh this
              page from your Stripe receipt link.
            </p>
          )}

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-orange-50 transition hover:bg-zinc-700"
            >
              Continue shopping
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
