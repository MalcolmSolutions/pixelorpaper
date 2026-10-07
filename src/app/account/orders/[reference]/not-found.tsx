import Link from "next/link";

/** Shown for unknown references and for orders that aren't the customer's. */
export default function OrderNotFound() {
  return (
    <div className="container-page section max-w-prose space-y-6">
      <p className="eyebrow">Your account</p>
      <h1>Order not found</h1>
      <p className="text-ink-muted">
        We couldn&rsquo;t find that order in your account. Check you&rsquo;re
        signed in with the email you used at checkout.
      </p>
      <Link href="/account" className="btn btn-outline">
        Your orders
      </Link>
    </div>
  );
}
