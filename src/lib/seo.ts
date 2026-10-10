import { PRINT_SIZES } from "@/lib/print-sizes";
import { site } from "@/lib/site";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

/**
 * The address search engines should index. A constant rather than SITE_URL
 * because static pages are rendered at build time, without the secret.
 * Staging serves the same canonical links but is kept out of the index by
 * the X-Robots-Tag header in next.config.ts.
 */
export const SITE_ORIGIN = "https://pixelorpaper.co.uk";

/** Open Graph defaults. Pages that set openGraph replace the layout's
 *  whole object, so they spread this in. */
export const OPEN_GRAPH = {
  siteName: site.name,
  locale: "en_GB",
  type: "website",
} as const;

export const absoluteUrl = (path: string) => new URL(path, SITE_ORIGIN).href;

export const collectionPath = (slug: string) => `/collections/${slug}`;

/** Text cut to a search snippet's length, at a word boundary. */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

// The size the product page selects first, so the marked-up price matches it.
const DEFAULT_SIZE = PRINT_SIZES[1];

const pounds = (pence: number) => (pence / 100).toFixed(2);

/** schema.org Product and BreadcrumbList for a product page. */
export function productJsonLd(product: Product, category?: Category) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const crumbs = [
    { name: "Prints", path: "/products" },
    ...(category
      ? [{ name: category.name, path: collectionPath(category.slug) }]
      : []),
    { name: product.name, path: `/products/${product.slug}` },
  ];
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: product.name,
      description: product.description,
      image: product.image.src,
      url,
      sku: product.slug,
      brand: { "@type": "Brand", name: site.name },
      ...(category && { category: `${category.name} photographic prints` }),
      offers: {
        "@type": "Offer",
        url,
        name: `${DEFAULT_SIZE.name} print`,
        price: pounds(product.prices[DEFAULT_SIZE.name]),
        priceCurrency: "GBP",
        availability: product.available
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: {
            "@type": "MonetaryAmount",
            value: "0",
            currency: "GBP",
          },
          shippingDestination: {
            "@type": "DefinedRegion",
            addressCountry: "GB",
          },
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path),
      })),
    },
  ];
}

/** schema.org Organization and WebSite for the home page. */
export function siteJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: site.name,
      url: absoluteUrl("/"),
      email: "support@pixelorpaper.co.uk",
      address: {
        "@type": "PostalAddress",
        addressLocality: site.address[0],
        addressRegion: site.address[1],
        postalCode: site.address[2],
        addressCountry: "GB",
      },
      sameAs: Object.values(site.links),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      name: site.name,
      url: absoluteUrl("/"),
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    },
  ];
}

/** JSON for a ld+json script tag, with `<` escaped so it can't close it. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The old site's product id for an image key (its toSlug of the key). */
export function oldProductIdFor(imageKey: string): string {
  return imageKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Finds the product an old /product/<id> address meant. The old site slugged
 * the whole bucket key (sometimes with a folder prefix in front) and numbered
 * repeats "-2", "-3"; keys always ended in a file extension.
 */
export function matchOldProductId<T extends { id: string }>(
  oldId: string,
  products: T[],
): T | undefined {
  const wanted = oldProductIdFor(oldId);
  const ids = products.map((p) => ({ product: p, id: oldProductIdFor(p.id) }));
  for (const candidate of [wanted, wanted.replace(/-\d+$/, "")]) {
    const exact = ids.find(({ id }) => id === candidate);
    if (exact) return exact.product;
    // A prefixed key: the longest product key it ends with.
    const suffix = ids
      .filter(({ id }) => candidate.endsWith(`-${id}`))
      .sort((a, b) => b.id.length - a.id.length)[0];
    if (suffix) return suffix.product;
  }
  return undefined;
}
