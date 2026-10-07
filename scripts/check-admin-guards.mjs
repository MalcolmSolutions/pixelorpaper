// Fails if any admin entry point can run without checking the admin role.
//
// Under src/app/admin, every exported async function in a page, layout,
// route handler or "use server" file (pages, generateMetadata, GET/POST,
// server actions) must start with `await requireAdmin()`. Server actions
// and pages are public endpoints, so the layout's check alone isn't enough.
//
// Usage: npm run check:admin
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ADMIN_DIR = join(ROOT, "src", "app", "admin");
const ENTRY_FILE = /^(page|layout|route|template|default)\.tsx?$/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.tsx?$/.test(name)) yield path;
  }
}

/** Source after `from`, skipping whitespace and comments. */
function skipTrivia(src, from) {
  let i = from;
  for (;;) {
    while (/\s/.test(src[i] ?? "")) i++;
    if (src.startsWith("//", i)) i = src.indexOf("\n", i) + 1 || src.length;
    else if (src.startsWith("/*", i)) i = src.indexOf("*/", i) + 2;
    else return i;
  }
}

/** Index just past the bracket that closes the one at `open`. */
function matchBracket(src, open) {
  const pairs = { "(": ")", "{": "}", "<": ">" };
  const close = pairs[src[open]];
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === src[open]) depth++;
    else if (src[i] === close && --depth === 0) return i + 1;
  }
  return -1;
}

const problems = [];
const report = (file, message) =>
  problems.push(`${relative(ROOT, file)}: ${message}`);

for (const file of walk(ADMIN_DIR)) {
  const src = readFileSync(file, "utf8");
  const isServerActions = /^\s*["']use server["']/.test(src);
  const isEntry = ENTRY_FILE.test(file.split(/[\\/]/).pop());
  if (!isServerActions && !isEntry) continue;

  if (isServerActions) {
    // Server actions must be plain `export async function` declarations so
    // they can be checked here.
    for (const m of src.matchAll(
      /export\s+(const|let|var|default\s+(?!async))/g,
    )) {
      report(
        file,
        `"use server" file exports with "${m[1].trim()}"; use export async function`,
      );
    }
  }

  const exported =
    /export\s+(?:default\s+)?async\s+function\s*(\w*)\s*(?:<[^>]*>)?\s*\(/g;
  let found = 0;
  for (const m of src.matchAll(exported)) {
    found++;
    const name = m[1] || "default";
    const paramsEnd = matchBracket(src, m.index + m[0].length - 1);
    const bodyStart = src.indexOf("{", paramsEnd);
    const first = src.slice(skipTrivia(src, bodyStart + 1), bodyStart + 200);
    if (
      !/^(?:(?:const|let)\s+[\w{}\s,:]+=\s*)?await\s+requireAdmin\(\)/.test(
        first,
      )
    ) {
      report(file, `${name}() must start with \`await requireAdmin()\``);
    }
  }

  if (isEntry && /export\s+default\s+function/.test(src)) {
    report(
      file,
      "default export must be an async function that awaits requireAdmin()",
    );
  }
  if (isEntry && found === 0) {
    report(file, "no exported async function calls requireAdmin()");
  }
}

if (problems.length) {
  console.error(`Admin guard check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(
  "Admin guard check passed: every admin entry point calls requireAdmin() first.",
);
