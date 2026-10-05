import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { removeFromCart, updateQuantity } from "@/app/cart/actions";
import { startCheckout } from "@/app/checkout/actions";
import { SubmitButton } from "@/components/cart/submit-button";
import { wallColour } from "@/components/room-mockup";
import { getCategory } from "@/lib/categories";
import { getCart, MAX_QUANTITY, type CartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cart",
};

const CHECKOUT_NOTICES: Record<string, string> = {
  cancelled: "Checkout was cancelled and no payment was taken.",
  unavailable:
    "Some prints are no longer available and were removed from your cart. Please check your cart and try again.",
  error:
    "We couldn't start checkout just now. No payment was taken; please try again.",
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
        <p role="status" className="mt-6 border-l-2 border-ink pl-4 text-sm">
          {checkoutNotice}
        </p>
      )}

      {cart.removedCount > 0 && (
        <p role="status" className="mt-6 border-l-2 border-ink pl-4 text-sm">
          {cart.removedCount === 1
            ? "One item is no longer available and was removed from your cart."
            : `${cart.removedCount} items are no longer available and were removed from your cart.`}
        </p>
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

          <aside className="space-y-4 self-start lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:col-span-4">
            <dl className="flex items-baseline justify-between border-b pb-4">
              <dt>
                Subtotal{" "}
                <span className="text-sm text-ink-muted tabular-nums">
                  ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
                </span>
              </dt>
              <dd className="text-lg tabular-nums">
                {formatPrice(cart.subtotal)}
              </dd>
            </dl>
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">UK delivery</span>
              <span>Free</span>
            </div>
            <p className="text-sm text-ink-muted">Prices include UK VAT.</p>
            <form action={startCheckout}>
              <SubmitButton className="btn btn-primary btn-block">
                Checkout
              </SubmitButton>
            </form>
            <Link href="/products" className="link block text-center text-sm">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

async function CartRow({ line }: { line: CartLine }) {
  const { product, size, quantity } = line;
  const category = await getCategory(product.category);
  const href = `/products/${product.slug}`;

  return (
    <li className="flex gap-4 py-5 sm:gap-6">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="media-well flex aspect-[4/5] w-20 shrink-0 items-center justify-center sm:w-24"
        style={
          category
            ? ({ "--wall": wallColour(category.wall) } as React.CSSProperties)
            : undefined
        }
      >
        <Image
          src={product.image.src}
          alt=""
          width={product.image.width}
          height={product.image.height}
          sizes="96px"
          className="mb-[10%] h-auto max-h-[70%] w-auto max-w-[80%] bg-white p-[4%] shadow-[0_4px_10px_-4px_rgb(0_0_0/0.4)]"
        />
      </Link>

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
