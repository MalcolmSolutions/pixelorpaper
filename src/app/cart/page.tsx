import type { Metadata } from "next";
import Link from "next/link";
import { removeFromCart, updateQuantity } from "@/app/cart/actions";
import { startCheckout } from "@/app/checkout/actions";
import { SubmitButton } from "@/components/cart/submit-button";
import { PrintThumbnail } from "@/components/print-thumbnail";
import { getCart, MAX_QUANTITY, type CartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cart",
};

const CHECKOUT_NOTICES: Record<
  string,
  { title: string; body: string; urgent?: boolean }
> = {
  cancelled: {
    title: "Checkout cancelled",
    body: "No payment was taken. Your cart is just as you left it.",
  },
  unavailable: {
    title: "Some prints are no longer available",
    body: "We've removed them from your cart. Please check your order before checking out again.",
    urgent: true,
  },
  error: {
    title: "We couldn't start checkout",
    body: "No payment was taken. Please try again in a moment.",
    urgent: true,
  },
};

export default async function CartPage(props: PageProps<"/cart">) {
  const [cart, { checkout }] = await Promise.all([
    getCart(),
    props.searchParams,
  ]);
  const checkoutNotice =
    typeof checkout === "string" ? CHECKOUT_NOTICES[checkout] : undefined;

  return (
    <div className="container-page section">
      <h1>Cart</h1>

      {checkoutNotice && (
        <Notice title={checkoutNotice.title} urgent={checkoutNotice.urgent}>
          {checkoutNotice.body}
        </Notice>
      )}

      {cart.removedCount > 0 && (
        <Notice title="Your cart has changed" urgent>
          {cart.removedCount === 1
            ? "One item is no longer available and was removed."
            : `${cart.removedCount} items are no longer available and were removed.`}
        </Notice>
      )}

      {cart.lines.length === 0 ? (
        <div className="mt-6 space-y-6">
          <p className="text-ink-muted">Your cart is empty.</p>
          <Link href="/products" className="btn btn-outline">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-16">
          <ul className="divide-y border-y lg:col-span-8">
            {cart.lines.map((line) => (
              <CartRow
                key={`${line.product.id}:${line.size.name}`}
                line={line}
              />
            ))}
          </ul>

          <aside
            aria-labelledby="order-summary"
            className="space-y-5 self-start lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:col-span-4"
          >
            <h2 id="order-summary" className="eyebrow">
              Order summary
            </h2>
            <dl className="space-y-2 border-b pb-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">
                  Subtotal ({cart.itemCount}{" "}
                  {cart.itemCount === 1 ? "item" : "items"})
                </dt>
                <dd className="tabular-nums">{formatPrice(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">UK tracked delivery</dt>
                <dd>Free</dd>
              </div>
            </dl>
            <dl className="flex items-baseline justify-between gap-4">
              <dt>
                Total <span className="text-sm text-ink-muted">incl. VAT</span>
              </dt>
              <dd className="text-lg tabular-nums">
                {formatPrice(cart.subtotal)}
              </dd>
            </dl>
            <form action={startCheckout}>
              <SubmitButton
                className="btn btn-primary btn-block"
                pendingLabel="Redirecting to Stripe…"
              >
                Checkout
              </SubmitButton>
            </form>
            <p className="text-center text-xs text-ink-muted">
              Payment is handled securely by Stripe. You can review your order
              before paying.
            </p>
            <Link href="/products" className="link block text-center text-sm">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function Notice({
  title,
  urgent,
  children,
}: {
  title: string;
  urgent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role={urgent ? "alert" : "status"}
      className={`mt-6 max-w-prose border-l-2 py-1 pl-4 text-sm ${urgent ? "border-ink" : "border-line"}`}
    >
      <p className="font-medium">{title}</p>
      <p className="text-ink-muted">{children}</p>
    </div>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const { product, size, quantity } = line;
  const href = `/products/${product.slug}`;

  return (
    <li className="flex gap-4 py-5 sm:gap-6">
      <PrintThumbnail product={product} />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-4">
          <Link
            href={href}
            className="font-medium underline-offset-4 hover:underline"
          >
            {product.name}
          </Link>
          <p className="shrink-0 tabular-nums">{formatPrice(line.lineTotal)}</p>
        </div>
        <p className="text-sm text-ink-muted tabular-nums">
          {size.name} · {size.widthMm / 10} × {size.heightMm / 10} cm ·{" "}
          {formatPrice(line.unitPrice)} each
        </p>

        <div className="flex items-center gap-5 pt-2">
          <div
            role="group"
            aria-label={`Quantity of ${product.name}, ${size.name}`}
            className="flex items-center border"
          >
            <form
              action={updateQuantity.bind(
                null,
                product.id,
                size.name,
                quantity - 1,
              )}
            >
              <SubmitButton
                aria-label={
                  quantity === 1 ? "Remove item" : "Decrease quantity"
                }
                className="size-10 hover:bg-sand-light disabled:opacity-40"
              >
                −
              </SubmitButton>
            </form>
            <span
              className="w-8 text-center text-sm tabular-nums"
              aria-live="polite"
            >
              {quantity}
            </span>
            <form
              action={updateQuantity.bind(
                null,
                product.id,
                size.name,
                quantity + 1,
              )}
            >
              <SubmitButton
                aria-label="Increase quantity"
                disabled={quantity >= MAX_QUANTITY}
                className="size-10 hover:bg-sand-light disabled:opacity-40"
              >
                +
              </SubmitButton>
            </form>
          </div>
          <form action={removeFromCart.bind(null, product.id, size.name)}>
            <SubmitButton className="link text-sm text-ink-muted hover:text-ink">
              Remove
            </SubmitButton>
          </form>
        </div>
      </div>
    </li>
  );
}
