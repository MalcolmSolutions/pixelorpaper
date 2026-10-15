// The Worker's entry point (wrangler.toml `main`): OpenNext's generated
// worker, plus a cron trigger. Every 10 minutes it asks the app to send
// queued print jobs and check placed ones (src/app/api/cron/fulfilment).
// Plain JS so the build doesn't type-check the generated import.
import handler from "./.open-next/worker.js";

export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

async function cronKey(token) {
  const data = new TextEncoder().encode(`pixelorpaper-cron:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const worker = {
  fetch: handler.fetch,

  async scheduled(_controller, env, ctx) {
    if (!env.PRINTSPACE_API_TOKEN || (env.PRINTSPACE_MODE ?? "off") === "off") {
      return;
    }
    const request = new Request("https://cron.internal/api/cron/fulfilment", {
      method: "POST",
      headers: { "x-cron-key": await cronKey(env.PRINTSPACE_API_TOKEN) },
    });
    ctx.waitUntil(
      handler.fetch(request, env, ctx).then(async (response) => {
        if (!response.ok) {
          console.error(
            `Fulfilment cron failed: ${response.status} ${await response.text()}`,
          );
        }
      }),
    );
  },
};

export default worker;
