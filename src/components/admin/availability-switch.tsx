import { setAvailability } from "@/app/admin/products/actions";
import { SubmitButton } from "@/components/cart/submit-button";
import { cn } from "@/lib/utils";

/**
 * A product's stock state with a button to change it. A plain form, so it
 * works without JavaScript; the server action checks the admin role.
 */
export function AvailabilitySwitch({
  slug,
  name,
  available,
  compact = false,
}: {
  slug: string;
  name: string;
  available: boolean;
  compact?: boolean;
}) {
  return (
    <form
      action={setAvailability}
      className={cn("flex items-center gap-3", compact && "flex-wrap gap-y-1")}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="available" value={available ? "0" : "1"} />
      <span className="flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            available ? "bg-ink" : "border border-ink-muted",
          )}
        />
        {available ? "In stock" : "Unavailable"}
      </span>
      <SubmitButton
        className={
          compact
            ? "link text-xs text-ink-muted hover:text-ink"
            : "btn btn-outline btn-sm"
        }
        pendingLabel="Saving…"
      >
        {available ? "Mark unavailable" : "Mark in stock"}
        <span className="sr-only"> {name}</span>
      </SubmitButton>
    </form>
  );
}
