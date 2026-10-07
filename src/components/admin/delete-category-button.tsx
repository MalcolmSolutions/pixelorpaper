"use client";

import { useActionState } from "react";
import {
  deleteCategory,
  type DeleteCategoryState,
} from "@/app/admin/categories/actions";

/** Deletes an empty category (the server refuses if it has products). */
export function DeleteCategoryButton({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState<
    DeleteCategoryState,
    FormData
  >(deleteCategory, { status: "idle" });
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className="link text-sm text-ink-muted hover:text-ink"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? "Deleting…" : "Delete"}
        <span className="sr-only"> {name}</span>
      </button>
      {state.status === "error" && (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
