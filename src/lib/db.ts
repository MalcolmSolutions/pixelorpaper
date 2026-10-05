import { getCloudflareContext } from "@opennextjs/cloudflare";

/** The D1 orders database (binding `DB` in wrangler.toml). */
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}
