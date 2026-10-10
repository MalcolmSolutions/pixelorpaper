import { PRINT_SIZES, type PrintSize } from "@/lib/print-sizes";
import { absoluteUrl } from "@/lib/seo";
import { site } from "@/lib/site";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

// The product feed read by Google Merchant Center and Pinterest catalogues:
// RSS 2.0 with Google's g: attributes, one item per print size, grouped by
// print. The digital download is left out (it isn't a shippable product).

/** Google's taxonomy: Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork. */
const GOOGLE_CATEGORY = "500044";

/** Merchant Center and Pinterest limit ids to 50 characters. */
const MAX_ID = 50;

const xml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Short, stable fingerprint so trimmed ids stay unique.
function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** An id of at most 50 characters, unique for each input. */
export function feedId(text: string): string {
  if (text.length <= MAX_ID) return text;
  const tail = `-${fnv1a(text)}`;
  return text.slice(0, MAX_ID - tail.length) + tail;
}

/** "12.99 GBP" from pence. */
export const feedPrice = (pence: number) => `${(pence / 100).toFixed(2)} GBP`;

/** The product page opened at one size. */
export const sizeLink = (product: Product, size: PrintSize) =>
  absoluteUrl(`/products/${product.slug}?size=${size.name}`);

function item(product: Product, size: PrintSize, category?: Category) {
  const dimensions = `${size.widthMm / 10} × ${size.heightMm / 10} cm`;
  const description =
    product.description ||
    `A photographic print from the ${category?.name ?? "Pixel or Paper"} collection.`;
  const fields: [string, string][] = [
    ["g:id", feedId(`${product.slug}-${size.name.toLowerCase()}`)],
    ["g:item_group_id", feedId(product.slug)],
    [
      "title",
      `${product.name} Photographic Print, ${size.name} (${dimensions})`,
    ],
    ["description", description],
    ["link", sizeLink(product, size)],
    ["g:image_link", product.image.src],
    ["g:availability", "in_stock"],
    ["g:price", feedPrice(product.prices[size.name])],
    ["g:condition", "new"],
    ["g:brand", site.name],
    ["g:identifier_exists", "no"],
    ["g:size", size.name],
    ["g:google_product_category", GOOGLE_CATEGORY],
    ["g:product_type", `Photographic Prints > ${category?.name ?? "Prints"}`],
  ];
  return [
    "<item>",
    ...fields.map(([tag, value]) => `<${tag}>${xml(value)}</${tag}>`),
    "<g:shipping><g:country>GB</g:country><g:price>0.00 GBP</g:price></g:shipping>",
    "</item>",
  ].join("\n");
}

/** The whole feed for the products on sale. */
export function productFeedXml(
  products: Product[],
  categories: Category[],
): string {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const items = products
    .filter((p) => p.available)
    .flatMap((p) =>
      PRINT_SIZES.map((size) => item(p, size, bySlug.get(p.category))),
    );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `<title>${xml(site.name)}</title>`,
    `<link>${absoluteUrl("/")}</link>`,
    `<description>${xml(`Photographic prints by ${site.name}`)}</description>`,
    ...items,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}
