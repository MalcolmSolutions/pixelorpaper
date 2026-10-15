import { createHash, timingSafeEqual } from "node:crypto";
import { runScheduledFulfilment } from "@/lib/printspace/fulfilment";

/**
 * Called every 10 minutes by the Worker's cron trigger (worker.js): sends
 * queued print jobs and checks the progress of placed ones. The caller
 * proves it's the Worker with a key derived from the API token, so no extra
 * secret is needed; anyone else gets a 404.
 */
export async function POST(request: Request) {
  const token = process.env.PRINTSPACE_API_TOKEN;
  const given = request.headers.get("x-cron-key") ?? "";
  if (!token) return new Response("Not found", { status: 404 });
  const expected = createHash("sha256")
    .update(`pixelorpaper-cron:${token}`)
    .digest("hex");
  if (
    given.length !== expected.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  ) {
    return new Response("Not found", { status: 404 });
  }

  await runScheduledFulfilment();
  return Response.json({ ok: true });
}
