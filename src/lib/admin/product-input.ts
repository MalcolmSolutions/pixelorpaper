import { readImageSize } from "@/lib/image-size";
import { previewEdge } from "@/lib/preview-size";

// Server-side validation of the admin product form. Nothing from the browser
// is trusted: every field is re-checked here, and images are identified by
// their bytes, not their name or type.

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_KEYWORDS = 20;

export type ProductFields = {
  name: string;
  description: string;
  categorySlug: string;
  location: string | null;
  keywords: string[];
};

export type UploadedImage = {
  bytes: ArrayBuffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

export type FieldErrors = Partial<
  Record<keyof ProductFields | "image" | "preview" | "form", string>
>;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseProductFields(
  formData: FormData,
): { ok: true; fields: ProductFields } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const name = text(formData, "name").replace(/\s+/g, " ");
  if (!name) errors.name = "Enter a name.";
  else if (name.length > 120) errors.name = "Keep the name to 120 characters.";

  const description = text(formData, "description");
  if (description.length > 2000) {
    errors.description = "Keep the description to 2,000 characters.";
  }

  const categorySlug = text(formData, "category");
  if (!/^[a-z0-9-]+$/.test(categorySlug))
    errors.categorySlug = "Choose a category.";

  const location = text(formData, "location");
  if (location.length > 120)
    errors.location = "Keep the location to 120 characters.";

  const keywords = [
    ...new Set(
      text(formData, "keywords")
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (keywords.length > MAX_KEYWORDS) {
    errors.keywords = `Use at most ${MAX_KEYWORDS} keywords.`;
  } else if (keywords.some((k) => k.length > 40)) {
    errors.keywords = "Keep each keyword to 40 characters.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    fields: {
      name,
      description,
      categorySlug,
      location: location || null,
      keywords,
    },
  };
}

/** The uploaded image, checked by size, file signature and dimensions. */
export async function parseImage(
  value: FormDataEntryValue | null,
): Promise<{ ok: true; image: UploadedImage } | { ok: false; error: string }> {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }
  if (value.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 20 MB or smaller." };
  }
  const bytes = await value.arrayBuffer();
  const head = new Uint8Array(bytes.slice(0, 12));
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...head.slice(from, to));

  let type: Pick<UploadedImage, "contentType" | "extension"> | null = null;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    type = { contentType: "image/jpeg", extension: "jpg" };
  } else if (ascii(1, 4) === "PNG" && head[0] === 0x89) {
    type = { contentType: "image/png", extension: "png" };
  } else if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    type = { contentType: "image/webp", extension: "webp" };
  }
  if (!type) return { ok: false, error: "Upload a JPEG, PNG or WebP image." };

  const size = readImageSize(Buffer.from(bytes));
  if (!size || size.width < 1 || size.height < 1) {
    return {
      ok: false,
      error: "That image couldn't be read. Try another file.",
    };
  }
  if (Math.max(size.width, size.height) < 1000) {
    return {
      ok: false,
      error:
        "Use an image at least 1,000 pixels on its longest side for printing.",
    };
  }
  return { ok: true, image: { bytes, ...type, ...size } };
}

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;

/**
 * The web preview the admin's browser made from the original (see
 * components/admin/product-form.tsx). Checked here rather than trusted: it
 * must be a JPEG at the size the preview rule gives for this original, with
 * the same shape, so a full-size image can't be published as a "preview".
 */
export async function parsePreview(
  value: FormDataEntryValue | null,
  original: Pick<UploadedImage, "width" | "height">,
): Promise<{ ok: true; bytes: ArrayBuffer } | { ok: false; error: string }> {
  if (!(value instanceof File) || value.size === 0) {
    return {
      ok: false,
      error:
        "The preview wasn't created. Choose the image again (JavaScript is needed).",
    };
  }
  if (value.size > MAX_PREVIEW_BYTES) {
    return {
      ok: false,
      error: "The preview is too large. Choose the image again.",
    };
  }
  const bytes = await value.arrayBuffer();
  const head = new Uint8Array(bytes.slice(0, 3));
  const size = readImageSize(Buffer.from(bytes));
  if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff || !size) {
    return {
      ok: false,
      error: "The preview couldn't be read. Choose the image again.",
    };
  }
  // Long sides and shape, so it doesn't matter which way up either is stored.
  const expected = previewEdge(Math.max(original.width, original.height));
  const ratio = (w: number, h: number) => Math.max(w, h) / Math.min(w, h);
  if (
    Math.abs(Math.max(size.width, size.height) - expected) > 2 ||
    Math.abs(
      ratio(size.width, size.height) - ratio(original.width, original.height),
    ) > 0.02
  ) {
    return {
      ok: false,
      error: "The preview doesn't match the image. Choose the image again.",
    };
  }
  return { ok: true, bytes };
}
