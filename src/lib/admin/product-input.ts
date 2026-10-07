import { readImageSize } from "@/lib/image-size";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/print-sizes";

// Server-side validation of the admin product form. Nothing from the browser
// is trusted: every field is re-checked here, prices are parsed to integer
// pence, and images are identified by their bytes, not their name or type.

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MIN_PRICE_PENCE = 100; // £1.00
const MAX_PRICE_PENCE = 100_000; // £1,000.00
const MAX_KEYWORDS = 20;

export type ProductFields = {
  name: string;
  description: string;
  categorySlug: string;
  location: string | null;
  keywords: string[];
  prices: Record<PrintSizeName, number>;
};

export type UploadedImage = {
  bytes: ArrayBuffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

export type FieldErrors = Partial<
  Record<
    keyof ProductFields | `price_${PrintSizeName}` | "image" | "form",
    string
  >
>;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** "£12.99", "12.99" or "12" → 1299; null if not a valid amount. */
export function parsePricePence(input: string): number | null {
  const match = input
    .replace(/[£,\s]/g, "")
    .match(/^(\d{1,4})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
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

  const prices = {} as Record<PrintSizeName, number>;
  for (const size of PRINT_SIZES) {
    const pence = parsePricePence(text(formData, `price_${size.name}`));
    if (pence === null) {
      errors[`price_${size.name}`] = "Enter a price like 12.99.";
    } else if (pence < MIN_PRICE_PENCE || pence > MAX_PRICE_PENCE) {
      errors[`price_${size.name}`] = "Prices must be between £1 and £1,000.";
    } else {
      prices[size.name] = pence;
    }
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
      prices,
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
