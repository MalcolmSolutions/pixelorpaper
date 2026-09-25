import type { Product } from "@/types/product";

export const siteSeo = {
  name: "Pixel or Paper",
  legalName: "Pixel or Paper by Malcolm Rose",
  defaultTitle: "Fine Art Photography Prints | Pixel or Paper",
  defaultDescription:
    "Buy original fine art photography prints by Malcolm Rose, including landscape, cityscape, architecture, and nature artwork for modern interiors.",
  keywords: [
    "fine art photography prints",
    "original photography prints",
    "landscape photography prints",
    "cityscape wall art",
    "architectural photography prints",
    "nature photography prints",
    "modern wall art",
    "Malcolm Rose photography",
    "Pixel or Paper",
  ],
};

export const categorySeo = {
  Landscapes: {
    slug: "landscapes",
    title: "Landscape Photography Prints",
    description:
      "Buy landscape photography prints by Malcolm Rose, from quiet coastlines to dramatic mountain skies and atmospheric rural scenes.",
  },
  Cityscapes: {
    slug: "cityscapes",
    title: "Cityscape Photography Prints",
    description:
      "Shop cityscape photography prints featuring reflective streets, architecture, and urban atmosphere from Malcolm Rose.",
  },
  Buildings: {
    slug: "buildings",
    title: "Architectural Photography Prints",
    description:
      "Browse architectural photography prints and building studies that celebrate quiet geometry, texture, and light.",
  },
  Nature: {
    slug: "nature",
    title: "Nature Photography Prints",
    description:
      "Find nature photography prints with woodland, organic textures, and quiet natural scenes for calm, modern interiors.",
  },
  Misc: {
    slug: "misc",
    title: "Collectible Photography Prints",
    description:
      "Discover unique collectible photography prints and atmospheric studies curated for thoughtful interior styling.",
  },
} as const;

export function getCategorySeo(category: string) {
  return (
    categorySeo[category as keyof typeof categorySeo] ?? {
      slug: category.toLowerCase().replace(/\s+/g, "-"),
      title: `${category} Photography Prints`,
      description: `Browse ${category.toLowerCase()} photography prints by Malcolm Rose for original wall art and modern interiors.`,
    }
  );
}

const ignoredTokens = new Set([
  "img",
  "image",
  "photo",
  "photography",
  "print",
  "prints",
  "edit",
  "final",
  "copy",
  "misc",
  "nature",
  "landscape",
  "landscapes",
  "cityscape",
  "cityscapes",
  "building",
  "buildings",
]);

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getFilenameKeywords(imagePath: string, title: string): string[] {
  const rawFileName = decodeURIComponent(imagePath.split("/").pop() ?? "");
  const noExt = rawFileName.replace(/\.[^.]+$/, "").toLowerCase();
  const titleWords = new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );

  const tokens = noExt
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => token.length > 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !ignoredTokens.has(token))
    .filter((token) => !titleWords.has(token));

  return Array.from(new Set(tokens))
    .slice(0, 3)
    .map((token) => toTitleCase(token));
}

export function getProductSeoDescription(
  product: Pick<
    Product,
    "title" | "artist" | "category" | "description" | "size"
  >,
): string {
  return `${product.title} by ${product.artist}. ${product.description} Available as a ${product.category.toLowerCase()} fine art print in ${product.size}.`;
}

export function getProductAltText(
  product: Pick<Product, "title" | "artist" | "category" | "size" | "image">,
): string {
  const fallbackKeywords = getFilenameKeywords(product.image, product.title);
  const locationHint =
    fallbackKeywords.length > 0
      ? `, featuring ${fallbackKeywords.join(", ")}`
      : "";

  return `${product.title}, ${product.category.toLowerCase()} fine art print by ${product.artist}${locationHint}, ${product.size}`;
}
