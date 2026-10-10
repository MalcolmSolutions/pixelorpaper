import { getCategories } from "@/lib/categories";
import { productFeedXml } from "@/lib/product-feed";
import { getProducts } from "@/lib/products";

// Product feed for Google Merchant Center and Pinterest. Built per request
// from the hour-long catalog cache, so new prints appear without a deploy.
export const dynamic = "force-dynamic";

export async function GET() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);
  return new Response(productFeedXml(products, categories), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
