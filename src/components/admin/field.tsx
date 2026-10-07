import { cn } from "@/lib/utils";

/** Shared input styling (matches the sign-in form's email field). */
export const inputClass =
  "block min-h-12 w-full rounded-sm border bg-surface px-4 text-base focus-visible:border-ink aria-invalid:border-ink";

/**
 * Labelled form control with an optional hint and a server-side error.
 * The child control gets its id, aria-invalid and aria-describedby here.
 */
export function Field({
  label,
  name,
  hint,
  error,
  className,
  render,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  className?: string;
  render: (props: {
    id: string;
    name: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const id = `field-${name}`;
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {render({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
