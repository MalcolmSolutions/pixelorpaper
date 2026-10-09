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
  // Forgives stray spaces, quotes or a trailing slash pasted into the secret.
  const value = process.env.SITE_URL?.trim().replace(/^["']|["']$/g, "");
  if (!value) {
    if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
    throw new Error("SITE_URL is not set");
  }
  const url = URL.canParse(value) ? new URL(value) : null;
  if (!url || !/^https?:$/.test(url.protocol)) {
    throw new Error(
      `SITE_URL must be a full address such as https://pixelorpaper.co.uk (got ${JSON.stringify(value)})`,
    );
  }
  return url.origin;
}
