import { readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

// Used for `npm run db:studio` (browse the local D1 database). Schema changes
// are written as SQL in migrations/ and applied with wrangler; the Drizzle
// schema mirrors them for typed queries.
const localDir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const localFile = (() => {
  try {
    const file = readdirSync(localDir).find((f) => f.endsWith(".sqlite"));
    return file ? join(localDir, file) : "";
  } catch {
    return "";
  }
})();

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: localFile },
});
