"use client";

import { useActionState } from "react";
import {
  createCategory,
  updateCategory,
  type CategoryFormState,
} from "@/app/admin/categories/actions";
import { Field, inputClass } from "@/components/admin/field";
import { wallColour } from "@/components/room-mockup";
import type { WallTone } from "@/types/room";

const WALLS: { value: WallTone; label: string }[] = [
  { value: "sand", label: "Sand" },
  { value: "grey", label: "Warm grey" },
  { value: "sage", label: "Sage" },
  { value: "white", label: "Off-white" },
];

export type CategoryFormValues = {
  name: string;
  description: string;
  wall: WallTone;
};

/** Create or edit a category; values are checked again on the server. */
export function CategoryForm({
  mode,
  slug,
  values,
}: {
  mode: "create" | "edit";
  slug?: string;
  values: CategoryFormValues;
}) {
  const [state, formAction, pending] = useActionState<
    CategoryFormState,
    FormData
  >(mode === "create" ? createCategory : updateCategory, { status: "idle" });
  const errors = state.status === "error" ? state.errors : {};
  // After a rejected submit, refill with what was sent (React resets forms).
  const sent = state.status === "error" ? state.values : null;
  const value = (name: keyof CategoryFormValues) =>
    sent?.[name] ?? values[name];
  const id = (name: string) => (slug ? `${name}-${slug}` : `${name}-new`);

  return (
    <form
      key={
        state.status === "error" ? JSON.stringify(state.values) : state.status
      }
      action={formAction}
      className="space-y-5"
      noValidate
    >
      {slug && <input type="hidden" name="slug" value={slug} />}
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Name"
          name={id("name")}
          hint={
            mode === "create"
              ? "The web address is made from this and can't change later."
              : undefined
          }
          error={errors.name}
          render={(props) => (
            <input
              {...props}
              name="name"
              defaultValue={value("name")}
              maxLength={60}
              required
              className={inputClass}
            />
          )}
        />
        <Field
          label="Description"
          name={id("description")}
          hint="Shown at the top of the category in the shop."
          error={errors.description}
          render={(props) => (
            <input
              {...props}
              name="description"
              defaultValue={value("description")}
              maxLength={300}
              className={inputClass}
            />
          )}
        />
      </div>

      <fieldset
        aria-describedby={errors.wall ? `${id("wall")}-error` : undefined}
        className="space-y-2"
      >
        <legend className="text-sm font-medium">Wall colour</legend>
        <p className="text-xs text-ink-muted">
          The wall prints from this category are shown on.
        </p>
        <div className="flex flex-wrap gap-2">
          {WALLS.map((wall) => (
            <label
              key={wall.value}
              className="chip cursor-pointer gap-2 has-checked:border-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
            >
              <input
                type="radio"
                name="wall"
                value={wall.value}
                defaultChecked={value("wall") === wall.value}
                className="sr-only"
              />
              <span
                aria-hidden
                className="size-4 rounded-full border"
                style={{ backgroundColor: wallColour(wall.value) }}
              />
              {wall.label}
            </label>
          ))}
        </div>
        {errors.wall && (
          <p id={`${id("wall")}-error`} className="text-sm">
            {errors.wall}
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create category"
              : "Save category"}
        </button>
        <p role="status" className="text-sm">
          {state.status === "saved" && state.message}
          {state.status === "error" &&
            (errors.form ?? "Check the highlighted fields.")}
        </p>
      </div>
    </form>
  );
}
