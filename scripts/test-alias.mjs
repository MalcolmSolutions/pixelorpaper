// Lets `node --test` run the TypeScript sources directly: resolves the "@/"
// path alias (tsconfig.json) to src/, adding the .ts/.tsx extension that
// Node's type stripping needs. Used by `npm test`.
import { existsSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = fileURLToPath(new URL("../src/", import.meta.url));

register(
  "data:text/javascript," +
    encodeURIComponent(`
      const src = ${JSON.stringify(pathToFileURL(src).href)};
      const candidates = ${JSON.stringify(["", ".ts", ".tsx", "/index.ts"])};
      export async function resolve(specifier, context, next) {
        if (specifier.startsWith("@/")) {
          for (const ext of candidates) {
            const url = new URL(specifier.slice(2) + ext, src);
            try {
              return await next(url.href, context);
            } catch {}
          }
        }
        return next(specifier, context);
      }
    `),
);

// Fail fast with a clear message if run from somewhere unexpected.
if (!existsSync(src)) throw new Error(`No src/ directory at ${src}`);
