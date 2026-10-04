import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cart",
};

export default function CartPage() {
  return (
    <div className="container-page section space-y-6">
      <h1>Cart</h1>
      <p className="text-ink-muted">Your cart is empty.</p>
      <Link href="/products" className="btn btn-outline">
        Continue shopping
      </Link>
    </div>
  );
}
