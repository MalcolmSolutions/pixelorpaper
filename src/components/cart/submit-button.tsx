"use client";

import { useFormStatus } from "react-dom";

/**
 * Form submit button that disables itself while its action runs, optionally
 * swapping its label (e.g. "Redirecting to Stripe…").
 */
export function SubmitButton({
  disabled,
  pendingLabel,
  children,
  ...props
}: React.ComponentProps<"button"> & { pendingLabel?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
