import { openDownload } from "@/lib/downloads";

const NO_STORE = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
};

/**
 * A paid digital download. Redirects to a signed link to the private
 * original that expires in minutes, so the link itself is worthless to share.
 * If the order doesn't allow downloads (yet), sends the customer back to the
 * order, which explains why.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/downloads/[reference]/[item]">,
) {
  const { reference, item } = await ctx.params;
  const sessionId = new URL(request.url).searchParams.get("session_id");

  let result;
  try {
    result = await openDownload(reference, item, sessionId);
  } catch (error) {
    console.error("Download failed", { reference, item }, error);
    return new Response("We couldn't start the download. Please try again.", {
      status: 503,
      headers: NO_STORE,
    });
  }

  if (result.kind === "not_found") {
    return new Response("Download not found.", {
      status: 404,
      headers: NO_STORE,
    });
  }
  const location =
    result.kind === "redirect"
      ? result.url
      : result.kind === "sign_in"
        ? new URL("/account/sign-in", request.url).href
        : result.via === "link" && sessionId
          ? new URL(
              `/checkout/success?session_id=${encodeURIComponent(sessionId)}`,
              request.url,
            ).href
          : new URL(
              `/account/orders/${encodeURIComponent(result.order.reference)}`,
              request.url,
            ).href;
  return new Response(null, {
    status: 303,
    headers: { ...NO_STORE, Location: location },
  });
}
