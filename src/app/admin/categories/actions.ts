"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  deleteEmptyCategory,
  insertCategory,
  moveCategory as reorderCategory,
  updateCategory as saveCategory,
} from "@/lib/admin/categories";
import {
  parseCategoryFields,
  parseSlug,
  type CategoryErrors,
} from "@/lib/admin/category-input";
import { CATALOG_TAG } from "@/lib/catalog";

export type CategoryFormState =
  | { status: "idle" }
  | { status: "saved"; message: string }
  | {
      status: "error";
      errors: CategoryErrors;
      /** What was submitted, so the form can refill after React resets it. */
      values: Record<string, string>;
    };

function submitted(formData: FormData) {
  return Object.fromEntries(
    ["name", "description", "wall"].map((name) => {
      const value = formData.get(name);
      return [name, typeof value === "string" ? value.slice(0, 500) : ""];
    }),
  );
}

export async function createCategory(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();
  const parsed = parseCategoryFields(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      errors: parsed.errors,
      values: submitted(formData),
    };
  }
  const slug = await insertCategory(parsed.fields);
  if (!slug) {
    return {
      status: "error",
      errors: { name: "A category with this name already exists." },
      values: submitted(formData),
    };
  }
  updateTag(CATALOG_TAG);
  return {
    status: "saved",
    message: `“${parsed.fields.name}” created. It appears in the shop once it has a product.`,
  };
}

export async function updateCategory(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();
  const slug = parseSlug(formData.get("slug"));
  const parsed = parseCategoryFields(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      errors: parsed.errors,
      values: submitted(formData),
    };
  }
  if (!slug || !(await saveCategory(slug, parsed.fields))) {
    return {
      status: "error",
      errors: { form: "This category no longer exists." },
      values: submitted(formData),
    };
  }
  updateTag(CATALOG_TAG);
  return { status: "saved", message: "Saved." };
}

export type DeleteCategoryState =
  { status: "idle" } | { status: "error"; message: string };

export async function deleteCategory(
  _previous: DeleteCategoryState,
  formData: FormData,
): Promise<DeleteCategoryState> {
  await requireAdmin();
  const slug = parseSlug(formData.get("slug"));
  if (!slug || !(await deleteEmptyCategory(slug))) {
    return {
      status: "error",
      message:
        "Only empty categories can be deleted. Move its products to another category first.",
    };
  }
  updateTag(CATALOG_TAG);
  return { status: "idle" };
}

export async function moveCategory(formData: FormData) {
  await requireAdmin();
  const slug = parseSlug(formData.get("slug"));
  const direction = formData.get("direction");
  if (!slug || (direction !== "up" && direction !== "down")) return;
  if (await reorderCategory(slug, direction)) updateTag(CATALOG_TAG);
}
