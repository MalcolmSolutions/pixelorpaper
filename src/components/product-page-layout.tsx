"use client";

import { useState } from "react";
import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";

type ProductPageLayoutProps = {
  children: React.ReactNode;
};

export function ProductPageLayout({ children }: ProductPageLayoutProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cart, subtotalCents, removeFromCart, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const checkout = async () => {
    if (cart.length === 0) {
      return;
    }

    setIsCheckingOut(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            purchaseType: item.variant.kind,
            printSizeKey:
              item.variant.kind === "print"
                ? item.variant.printSizeKey
                : undefined,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Checkout failed");
      }

      const payload = (await response.json()) as { url?: string };
      if (payload.url) {
        window.location.href = payload.url;
      }
    } catch {
      alert(
        "Checkout could not be started. Confirm your Stripe keys in .env.local.",
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      <PageHeader onCartClick={() => setIsCartOpen((value) => !value)} />

      <div className="relative min-h-screen overflow-hidden">
        <div className="pt-32">{children}</div>

        {isCartOpen ? (
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 z-[15] bg-zinc-900/30 backdrop-blur-[1px]"
          />
        ) : null}

        <aside
          className={`fixed right-0 top-0 z-20 h-full w-full max-w-md border-l border-zinc-200 bg-orange-50/95 p-6 shadow-xl backdrop-blur-md transition-transform duration-300 ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-2xl font-bold text-zinc-900">Your cart</h3>
            <button
              onClick={() => setIsCartOpen(false)}
              type="button"
              className="text-sm font-semibold text-zinc-700"
            >
              Close
            </button>
          </div>

          <div className="flex h-[calc(100%-8rem)] flex-col justify-between gap-4">
            <div className="space-y-3 overflow-y-auto pr-2">
              {cart.length === 0 ? (
                <p className="rounded-xl bg-white p-4 text-sm text-zinc-600">
                  No prints yet. Add one from the gallery.
                </p>
              ) : (
                cart.map((item) => {
                  const product = item.product;

                  return (
                    <div key={item.lineId} className="rounded-xl bg-white p-4">
                      <p className="text-sm font-semibold text-zinc-900">
                        {product.title}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {item.variantLabel}
                      </p>
                      <p className="mb-2 text-xs text-zinc-600">
                        x{item.quantity}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-700">
                          {formatPrice(item.unitPriceCents * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.lineId)}
                          type="button"
                          className="text-xs font-semibold uppercase tracking-wide text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-zinc-700">
                <span>Subtotal</span>
                <strong className="text-lg text-zinc-900">
                  {formatPrice(subtotalCents)}
                </strong>
              </div>
              <button
                onClick={checkout}
                disabled={cart.length === 0 || isCheckingOut}
                type="button"
                className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-orange-50 transition enabled:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {isCheckingOut
                  ? "Starting checkout..."
                  : "Checkout with Stripe"}
              </button>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                type="button"
                className="w-full rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear cart
              </button>
            </div>
          </div>
        </aside>

        <SiteFooter />
      </div>
    </>
  );
}
