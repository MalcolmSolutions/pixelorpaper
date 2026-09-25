import { getCatalogProducts } from "@/lib/catalog";

export const runtime = "edge";

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
