import { WALL_TONES } from "@/db/schema";
import type { WallTone } from "@/types/room";

// Server-side validation of the admin category forms.

export type CategoryFields = {
  name: string;
  description: string;
  wall: WallTone;
};

export type CategoryErrors = Partial<
  Record<keyof CategoryFields | "form", string>
>;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseCategoryFields(
  formData: FormData,
):
  { ok: true; fields: CategoryFields } | { ok: false; errors: CategoryErrors } {
  const errors: CategoryErrors = {};

  const name = text(formData, "name").replace(/\s+/g, " ");
  if (!name) errors.name = "Enter a name.";
  else if (name.length > 60) errors.name = "Keep the name to 60 characters.";
  else if (!/[a-z0-9]/i.test(name)) {
    errors.name = "Use at least one letter or number.";
  }

  // An intro of a paragraph or two; blank lines separate paragraphs.
  const description = text(formData, "description").replace(/\r\n?/g, "\n");
  if (description.length > 1500) {
    errors.description = "Keep the description to 1,500 characters.";
  }

  const wall = text(formData, "wall");
  if (!(WALL_TONES as readonly string[]).includes(wall)) {
    errors.wall = "Choose a wall colour.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, fields: { name, description, wall: wall as WallTone } };
}

/** Slug from the URL-safe characters of a category slug field. */
export function parseSlug(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value)
    ? value
    : null;
}
