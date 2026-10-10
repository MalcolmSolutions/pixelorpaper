import { getProducts } from "@/lib/products";
import { matchOldProductId } from "@/lib/seo";

/**
 * The previous site's product pages (/product/<slugged bucket key>), still in
 * search results and old links: sends them permanently to the same print.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/product/[id]">,
) {
  const { id } = await ctx.params;
  const product = matchOldProductId(id, await getProducts());
  const target = product ? `/products/${product.slug}` : "/products";
  return Response.redirect(new URL(target, request.url), 308);
}
