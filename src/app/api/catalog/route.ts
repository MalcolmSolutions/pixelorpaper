import { getCatalogProducts } from "@/lib/catalog";

export async function GET() {
  const products = await getCatalogProducts();

  return Response.json(
    { products },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
