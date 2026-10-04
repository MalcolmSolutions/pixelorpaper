import { unstable_cache } from "next/cache";
import { cache } from "react";
import { readImageSize } from "@/lib/image-size";
import { getObject, listObjectKeys, publicUrl } from "@/lib/r2";
import type { Category } from "@/types/category";
import type { Orientation, Product } from "@/types/product";
import type { WallTone } from "@/types/room";

// Builds the catalog from the R2 bucket. Each top-level folder is a
// category and each image in it a product. Optional per-image details live
// in `metadata/<filename>.json`. Pages should use lib/products.ts and
// lib/categories.ts rather than importing this module.

type Catalog = { products: Product[]; categories: Category[] };

type ImageMetadata = {
  title?: string;
  description?: string;
  location?: string;
  keywords?: string[];
  resolution?: string;
  price_gbp?: number;
};

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const METADATA_PREFIX = "metadata/";
// Folders that hold something other than shop images.
const RESERVED_FOLDERS = new Set([
  "metadata",
  process.env.R2_PRIVATE_ORIGINAL_PREFIX || "originals",
]);

const CATEGORY_DETAILS: Record<
  string,
  { name?: string; description: string; wall: WallTone }
> = {
  architecture: {
    description:
      "Columns, arches, bridges and landmarks from around the world.",
    wall: "grey",
  },
  buildings: {
    description: "Facades, interiors and characterful houses.",
    wall: "sand",
  },
  cars: {
    description: "Classic and vintage cars, photographed on location.",
    wall: "grey",
  },
  churches: {
    description: "Cathedrals, chapels and quiet sacred interiors.",
    wall: "white",
  },
  cityscapes: {
    description: "Skylines, harbours and streets, from Sydney to Venice.",
    wall: "grey",
  },
  gardens: { description: "Parks, pathways and planted spaces.", wall: "sage" },
  landscapes: {
    description: "Coastlines, mountains and wide open skies.",
    wall: "sage",
  },
  nature: {
    description: "Wildlife, flowers and the natural world up close.",
    wall: "sage",
  },
  people: {
    description: "Performers, portraits and everyday moments.",
    wall: "sand",
  },
  misc: {
    name: "Miscellaneous",
    description: "Small details, odd corners and everything in between.",
    wall: "sand",
  },
};

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "over",
  "the",
  "to",
  "with",
]);

function titleCase(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) =>
      i > 0 && SMALL_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/** "1769878521789-mixed-landscape-6000x3376-37.jpg" -> "Mixed Landscape" */
function titleFromFilename(filename: string) {
  const words = filename
    .replace(IMAGE_EXT, "")
    .replace(/^\d{10,}-/, "") // upload timestamp
    .replace(/\d{3,5}x\d{3,5}/gi, "") // pixel dimensions
    .replace(/[-_]+/g, " ")
    .replace(/(\s\d{1,2})+\s*$/, "") // trailing copy numbers
    .trim();
  return titleCase(words || filename.replace(IMAGE_EXT, ""));
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(IMAGE_EXT, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function orientationOf(width: number, height: number): Orientation {
  const ratio = width / height;
  if (ratio > 1.05) return "landscape";
  if (ratio < 0.95) return "portrait";
  return "square";
}

function parseResolution(resolution?: string) {
  const match = resolution?.match(/^(\d+)\s*x\s*(\d+)$/i);
  return match
    ? { width: Number(match[1]), height: Number(match[2]) }
    : undefined;
}

/** Run `fn` over `items` with at most `limit` requests in flight. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

// Network failures propagate (after retries in lib/r2.ts) so a partial
// catalog is never cached; only unreadable file contents fall back.
async function fetchMetadata(filename: string) {
  const res = await getObject(`${METADATA_PREFIX}${filename}.json`);
  try {
    return JSON.parse(await res.text()) as ImageMetadata;
  } catch {
    return undefined;
  }
}

/** Read dimensions from the image header with a ranged request. */
async function fetchImageSize(key: string) {
  const res = await getObject(key, 131072);
  return readImageSize(Buffer.from(await res.arrayBuffer()));
}

/** Interleave categories so the default order shows a varied mix. */
function interleave(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
  }
  const queues = [...groups.values()];
  const result: Product[] = [];
  for (let i = 0; result.length < products.length; i++) {
    for (const queue of queues) if (queue[i]) result.push(queue[i]);
  }
  return result;
}

async function buildCatalog(): Promise<Catalog> {
  const keys = await listObjectKeys();
  const metadataFiles = new Set(
    keys
      .filter((k) => k.startsWith(METADATA_PREFIX))
      .map((k) => k.slice(METADATA_PREFIX.length).replace(/\.json$/, "")),
  );
  const imageKeys = keys.filter((key) => {
    const parts = key.split("/");
    return (
      parts.length === 2 &&
      !RESERVED_FOLDERS.has(parts[0]) &&
      IMAGE_EXT.test(key)
    );
  });

  const defaultPrice = Number(process.env.DEFAULT_PRODUCT_PRICE_CENTS) || 2500;
  const usedSlugs = new Set<string>();

  const products = await mapLimit(
    imageKeys,
    16,
    async (key): Promise<Product> => {
      const [category, filename] = key.split("/");
      const meta = metadataFiles.has(filename)
        ? await fetchMetadata(filename)
        : undefined;
      const size = parseResolution(meta?.resolution) ??
        (await fetchImageSize(key)) ?? { width: 3, height: 2 };

      const name = meta?.title?.trim() || titleFromFilename(filename);
      const categoryName =
        CATEGORY_DETAILS[category]?.name ?? titleCase(category);
      const description =
        meta?.description?.trim() ||
        `A photographic print from the ${categoryName} collection.`;

      return {
        id: key,
        slug: "",
        name,
        description,
        price:
          typeof meta?.price_gbp === "number" && meta.price_gbp > 0
            ? Math.round(meta.price_gbp * 100)
            : defaultPrice,
        currency: "GBP",
        category,
        image: {
          src: publicUrl(key),
          width: size.width,
          height: size.height,
          alt: meta?.description?.trim() || name,
        },
        orientation: orientationOf(size.width, size.height),
        location:
          meta?.location && !/unspecified|unknown/i.test(meta.location)
            ? meta.location
            : undefined,
        keywords: meta?.keywords ?? [],
      };
    },
  );

  // Assign slugs after the parallel step so duplicates resolve deterministically.
  for (const product of products) {
    const base = slugify(product.id.split("/")[1]) || "print";
    let slug = base;
    if (usedSlugs.has(slug)) slug = `${base}-${product.category}`;
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
    usedSlugs.add(slug);
    product.slug = slug;
  }

  const counts = new Map<string, number>();
  for (const p of products)
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);

  const categories: Category[] = [...counts]
    .map(([slug, count]) => {
      const details = CATEGORY_DETAILS[slug];
      return {
        slug,
        name: details?.name ?? titleCase(slug.replace(/[-_]+/g, " ")),
        description:
          details?.description ?? "Photographic prints from our archive.",
        wall: details?.wall ?? "sand",
        count,
      };
    })
    // Alphabetical, with the catch-all category last.
    .sort((a, b) =>
      a.slug === "misc"
        ? 1
        : b.slug === "misc"
          ? -1
          : a.name.localeCompare(b.name),
    );

  // Lead with prints that have curated metadata (they carry keywords).
  const curatedFirst = products.toSorted(
    (a, b) => Number(b.keywords.length > 0) - Number(a.keywords.length > 0),
  );

  return { products: interleave(curatedFirst), categories };
}

const getCachedCatalog = unstable_cache(buildCatalog, ["r2-catalog"], {
  revalidate: 3600,
  tags: ["catalog"],
});

/** The full catalog, cached for an hour and deduplicated per request. */
export const getCatalog = cache(() => getCachedCatalog());
