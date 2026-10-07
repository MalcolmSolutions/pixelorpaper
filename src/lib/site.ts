export const site = {
  name: "Pixel or Paper",
  // TODO: replace with the store's own Etsy shop and Adobe Stock contributor URLs.
  links: {
    etsy: "https://www.etsy.com",
    adobeStock: "https://stock.adobe.com",
  },
};

/**
 * Absolute site URL for links back to the store (Stripe redirects, emails).
 * Read at runtime, not a NEXT_PUBLIC_ variable, which Next inlines at build.
 */
export function siteUrl(): string {
  const url = process.env.SITE_URL;
  if (url) return url.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("SITE_URL is not set");
}
