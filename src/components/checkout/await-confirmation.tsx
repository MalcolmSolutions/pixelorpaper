"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

/**
 * Re-renders the page every few seconds until Stripe's webhook has confirmed
 * the order, then offers a manual retry if it takes unusually long. The page
 * itself only ever reads the order from the database.
 */
export function AwaitConfirmation() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) return;
    const timer = setTimeout(() => {
      router.refresh();
      setAttempts((n) => n + 1);
    }, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [attempts, router]);

  return attempts >= MAX_ATTEMPTS ? (
    <div className="space-y-3" role="status">
      <p className="text-sm text-ink-muted">
        This is taking longer than usual. If you&rsquo;ve paid, your order will
        appear here shortly.
      </p>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setAttempts(0)}
      >
        Check again
      </button>
    </div>
  ) : null; // The order progress shows the waiting state meanwhile.
}
