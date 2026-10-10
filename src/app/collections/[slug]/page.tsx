import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  parseListingOptions,
  ProductListing,
} from "@/components/products/product-listing";
import { getCategories } from "@/lib/categories";
import { getProducts } from "@/lib/products";
import { collectionPath, metaDescription, OPEN_GRAPH } from "@/lib/seo";

async function findCollection(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function generateMetadata(
  props: PageProps<"/collections/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await findCollection(slug);
  if (!category) return { title: "Collection not found" };

  const [lead] = await getProducts({ category: slug });
  const path = collectionPath(slug);
  return {
    title: `${category.name} Photographic Prints`,
    description: metaDescription(
      `${category.description ? `${category.description} ` : ""}${category.count} ${category.name.toLowerCase()} photographic prints, printed to order in A5 to A2 or as digital downloads. Free UK delivery.`,
    ),
    alternates: { canonical: path },
    openGraph: {
      ...OPEN_GRAPH,
      url: path,
      ...(lead && {
        images: [
          {
            url: lead.image.src,
            width: lead.image.width,
            height: lead.image.height,
            alt: lead.image.alt,
          },
        ],
      }),
    },
  };
}

export default async function CollectionPage(
  props: PageProps<"/collections/[slug]">,
) {
  const { slug } = await props.params;
  const category = await findCollection(slug);
  if (!category) notFound();

  return (
    <ProductListing
      category={category}
      options={parseListingOptions(await props.searchParams)}
    />
  );
}
