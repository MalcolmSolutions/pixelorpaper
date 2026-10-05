"use client";

import { useFormStatus } from "react-dom";

/** Form submit button that disables itself while its action runs. */
export function SubmitButton({
  disabled,
  ...props
}: React.ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    />
  );
}
