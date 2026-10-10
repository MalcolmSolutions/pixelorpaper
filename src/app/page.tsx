import type { Metadata } from "next";
import { BestSellers } from "@/components/home/best-sellers";
import { FeaturedCollections } from "@/components/home/featured-collections";
import { Hero } from "@/components/home/hero";
import { PriceList } from "@/components/home/price-list";
import { WallBuilder } from "@/components/home/wall-builder";
import { getCategories } from "@/lib/categories";
import { getBestSellers, getProducts } from "@/lib/products";
import { jsonLdScript, OPEN_GRAPH, siteJsonLd } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [lead] = await getProducts({ category: "landscapes" });
  return {
    title: { absolute: "Pixel or Paper | Photographic Wall Art Prints, UK" },
    alternates: { canonical: "/" },
    openGraph: {
      ...OPEN_GRAPH,
      url: "/",
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

export default async function Home() {
  const [categories, products, bestSellers] = await Promise.all([
    getCategories(),
    getProducts(),
    getBestSellers(8),
  ]);

  // Hero: three photos from the Landscapes category (falls back to the
  // general order if that category ever has fewer than three).
  // The first one takes the large centre frame (slot 1 of the layout).
  const [centre, left, right] = [
    ...products.filter((p) => p.category === "landscapes"),
    ...products,
  ];
  const heroPrints = [left, centre, right].map((p) => p.image);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(siteJsonLd()) }}
      />
      <Hero categories={categories} prints={heroPrints} />
      <FeaturedCollections categories={categories} products={products} />
      <BestSellers products={bestSellers} />
      <PriceList />
      <WallBuilder prints={products.slice(0, 24).map((p) => p.image)} />
    </>
  );
}
