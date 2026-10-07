"use client";

import { useActionState } from "react";
import { importProducts, type ImportState } from "@/app/admin/products/actions";
import { cn } from "@/lib/utils";

/** Copies prints from the R2 bucket into the catalog (safe to repeat). */
export function ImportButton({ primary = false }: { primary?: boolean }) {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importProducts,
    { status: "idle" },
  );
  return (
    <form action={formAction} className="space-y-3">
      <button
        type="submit"
        className={cn("btn btn-sm", primary ? "btn-primary" : "btn-outline")}
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? "Importing… this can take a minute" : "Import from bucket"}
      </button>
      {state.status !== "idle" && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
