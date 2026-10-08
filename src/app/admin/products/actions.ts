"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import {
  categoryExists,
  getProductBySlug,
  importFromBucket,
  insertProduct,
  setProductAvailability,
  updateProduct as saveProduct,
} from "@/lib/admin/catalog";
import {
  parseImage,
  parseProductFields,
  type FieldErrors,
} from "@/lib/admin/product-input";
import { CATALOG_TAG } from "@/lib/catalog";
import { deleteObject, putObject, R2UploadError } from "@/lib/r2";

export type ProductFormState =
  | { status: "idle" }
  | { status: "saved"; message: string }
  | {
      status: "error";
      errors: FieldErrors;
      /** What was submitted, so the form can refill after React resets it. */
      values: Record<string, string>;
    };

const TEXT_FIELDS = [
  "name",
  "description",
  "category",
  "location",
  "keywords",
  "price_A5",
  "price_A4",
  "price_A3",
  "price_A2",
];

function submitted(formData: FormData) {
  return Object.fromEntries(
    TEXT_FIELDS.map((name) => {
      const value = formData.get(name);
      return [name, typeof value === "string" ? value.slice(0, 2000) : ""];
    }),
  );
}

/**
 * Creates a product: validates the form and image, uploads the image to R2,
 * then saves the product and its prices.
 */
export async function createProduct(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductFields(formData);
  const image = await parseImage(formData.get("image"));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };
  if (!image.ok) errors.image = image.error;
  if (parsed.ok && !(await categoryExists(parsed.fields.categorySlug))) {
    errors.categorySlug = "Choose a category.";
  }
  if (!parsed.ok || !image.ok || Object.keys(errors).length > 0) {
    return { status: "error", errors, values: submitted(formData) };
  }

  // Top-level key: the live site (main) only lists images inside folders,
  // so admin uploads can't appear there by accident.
  const imageKey = `admin-upload-${crypto.randomUUID()}.${image.image.extension}`;
  let slug: string;
  try {
    await putObject(imageKey, image.image.bytes, image.image.contentType);
  } catch (error) {
    console.error("Product image upload failed", error);
    const permanent =
      error instanceof R2UploadError && error.isPermissionProblem;
    return {
      status: "error",
      errors: permanent
        ? {
            image:
              "Image uploads are blocked: the shop's storage key isn't allowed to add files, so trying again won't help.",
            form: "Uploads need an R2 API token with Object Read & Write access for the image bucket. Once it's set, create the product again.",
          }
        : {
            image:
              "The image couldn't be uploaded just now. Please try again in a moment.",
          },
      values: submitted(formData),
    };
  }
  try {
    slug = await insertProduct(parsed.fields, imageKey, image.image);
  } catch (error) {
    console.error("Saving product failed", error);
    await deleteObject(imageKey).catch(() => {});
    return {
      status: "error",
      errors: { form: "The product couldn't be saved. Please try again." },
      values: submitted(formData),
    };
  }

  updateTag(CATALOG_TAG);
  redirect(`/admin/products/${slug}?created=1`);
}

/** Updates a product's details, category and prices. */
export async function updateProduct(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const slug = formData.get("slug");
  const existing =
    typeof slug === "string" ? await getProductBySlug(slug) : null;
  if (!existing) {
    return {
      status: "error",
      errors: { form: "This product no longer exists." },
      values: submitted(formData),
    };
  }

  const parsed = parseProductFields(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      errors: parsed.errors,
      values: submitted(formData),
    };
  }
  if (!(await categoryExists(parsed.fields.categorySlug))) {
    return {
      status: "error",
      errors: { categorySlug: "Choose a category." },
      values: submitted(formData),
    };
  }

  await saveProduct(existing.row.id, parsed.fields);
  updateTag(CATALOG_TAG);
  return { status: "saved", message: "Changes saved." };
}

export type ImportState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

/** Copies prints from the R2 bucket into the database (safe to repeat). */
export async function importProducts(): Promise<ImportState> {
  await requireAdmin();
  try {
    const result = await importFromBucket();
    updateTag(CATALOG_TAG);
    return {
      status: "done",
      message:
        result.imported === 0
          ? `Already up to date: all ${result.inBucket} prints in the bucket are in the catalog.`
          : `Imported ${result.imported} ${result.imported === 1 ? "print" : "prints"} across ${result.categories} categories.`,
    };
  } catch (error) {
    console.error("Import from bucket failed", error);
    return {
      status: "error",
      message: "The import didn't finish. It's safe to run it again.",
    };
  }
}

/**
 * Puts a product on or off sale. Prints never run out (each is made to
 * order from the same image), so this is the only "stock" there is.
 * Off sale: hidden from listings, its page says it's unavailable,
 * carts drop it and checkout refuses it.
 */
export async function setAvailability(formData: FormData) {
  await requireAdmin();
  const slug = formData.get("slug");
  const available = formData.get("available");
  if (
    typeof slug !== "string" ||
    !/^[a-z0-9-]{1,200}$/.test(slug) ||
    (available !== "1" && available !== "0")
  ) {
    return;
  }
  if (await setProductAvailability(slug, available === "1")) {
    updateTag(CATALOG_TAG);
  }
}
