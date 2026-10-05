"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

/**
 * Re-renders the page every few seconds until Stripe's webhook has confirmed
 * the order. The page itself only ever reads the order from the database.
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
    <p className="text-sm text-ink-muted">
      This is taking longer than usual. If you&rsquo;ve paid, your order will
      appear here shortly; refresh the page in a minute.
    </p>
  ) : (
    <p className="text-sm text-ink-muted" aria-live="polite">
      Confirming your payment…
    </p>
  );
}
