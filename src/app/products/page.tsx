import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import {
  listingQuery,
  one,
  parseListingOptions,
  ProductListing,
} from "@/components/products/product-listing";
import { getCategories } from "@/lib/categories";
import { collectionPath, OPEN_GRAPH } from "@/lib/seo";

export const metadata: Metadata = {
  title: "All Photographic Prints",
  description:
    "Browse every photographic print: landscapes, cities, architecture, nature and more, printed to order in A5 to A2 with free UK delivery.",
  // Sort and "Show more" pages are variations of this one listing.
  alternates: { canonical: "/products" },
  openGraph: { ...OPEN_GRAPH, url: "/products" },
};

export default async function ProductsPage(props: PageProps<"/products">) {
  const params = await props.searchParams;
  const options = parseListingOptions(params);

  // Categories used to be ?category=<slug>; they now have their own pages.
  const category = one(params.category);
  if (category) {
    const known = (await getCategories()).some((c) => c.slug === category);
    if (known) permanentRedirect(collectionPath(category) + listingQuery(options));
  }

  return <ProductListing options={options} />;
}
