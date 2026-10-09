// Removes local development settings from the Worker bundle before deploy.
//
// `opennextjs-cloudflare build` copies every .env file into
// .open-next/cloudflare/next-env.mjs, one export per mode. Deployed Workers
// only use `production`, but the `development` and `test` values (API keys
// from .env.development.local) would still be uploaded. This empties them.
// Production secrets live on the Worker (`npx wrangler secret put NAME`).
//
// Usage: runs between build and deploy in `npm run deploy` / `deploy:staging`.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const file = join(import.meta.dirname, "..", ".open-next/cloudflare/next-env.mjs");
const { production } = await import(pathToFileURL(file).href);

writeFileSync(
  file,
  [
    `export const production = ${JSON.stringify(production)};`,
    "export const development = {};",
    "export const test = {};",
    "",
  ].join("\n"),
);

const kept = Object.keys(production);
console.log(
  `next-env.mjs: kept production (${kept.join(", ") || "none"}), removed development and test`,
);

// Guard against secrets slipping into production through a committed .env file.
const SECRET = /^(sk|rk)_(live|test)_|^whsec_|^re_/;
const leaked = kept.filter((key) => SECRET.test(String(production[key])));
if (leaked.length) {
  console.error(`Secret-looking values in production env files: ${leaked.join(", ")}`);
  process.exit(1);
}
