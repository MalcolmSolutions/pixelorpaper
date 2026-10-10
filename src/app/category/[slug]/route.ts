import { getCategories } from "@/lib/categories";
import { collectionPath } from "@/lib/seo";

/** The previous site's category pages: sends them to the new collection. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/category/[slug]">,
) {
  const { slug } = await ctx.params;
  const wanted = slug.toLowerCase();
  const known = (await getCategories()).some((c) => c.slug === wanted);
  const target = known ? collectionPath(wanted) : "/products";
  return Response.redirect(new URL(target, request.url), 308);
}
