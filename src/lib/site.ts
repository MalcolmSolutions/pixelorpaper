export const site = {
  name: "Pixel or Paper",
  /** Trader's geographic address, shown on the contact and terms pages. */
  address: ["Peacehaven", "East Sussex", "BN10 7ST"],
  links: {
    etsy: "https://pixelorpaperart.etsy.com",
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
