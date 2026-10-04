import { BestSellers } from "@/components/home/best-sellers";
import { FeaturedCollections } from "@/components/home/featured-collections";
import { Hero } from "@/components/home/hero";
import { WallBuilder } from "@/components/home/wall-builder";
import { getCategories } from "@/lib/categories";
import { getBestSellers, getProducts } from "@/lib/products";

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
      <Hero categories={categories} prints={heroPrints} />
      <FeaturedCollections categories={categories} products={products} />
      <BestSellers products={bestSellers} />
      <WallBuilder prints={products.slice(0, 24).map((p) => p.image)} />
    </>
  );
}
