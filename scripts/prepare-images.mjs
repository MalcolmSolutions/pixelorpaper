// Copies every catalog image's full-resolution original into the PRIVATE
// originals bucket and writes a web-size preview to the PUBLIC previews
// bucket, so the shop never has to link an original.
//
//   npm run images:prepare              dry run: checks and reports, writes nothing
//   npm run images:prepare -- --apply   copies and generates (resumable)
//   add --remote to read the product list from the remote D1 database
//
// Reads originals from their current public URLs (NEXT_PUBLIC_IMAGE_BASE_URL,
// the live site's bucket) and never writes to that bucket. Writes use the
// R2 key in .env.local (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY), which
// should only have access to the two new buckets.
import { execFileSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const require = createRequire(join(ROOT, "package.json"));
require("@next/env").loadEnvConfig(ROOT, true, { info() {}, error() {} });
const sharp = require("sharp");

const APPLY = process.argv.includes("--apply");
const REMOTE = process.argv.includes("--remote");
const ORIGINALS_BUCKET = "pixelorpaper-originals";
const PREVIEWS_BUCKET = "pixelorpaper-previews";
const PREVIEW_LONG_EDGE = 2000;
// Originals at or below PREVIEW_LONG_EDGE get a preview at half their size
// (never below MIN_PREVIEW_EDGE), so a download is always clearly larger.
const MIN_PREVIEW_EDGE = 600;

/** Longest side of the preview for an original with this longest side. */
function previewEdge(originalEdge) {
  if (originalEdge > PREVIEW_LONG_EDGE) return PREVIEW_LONG_EDGE;
  return Math.max(MIN_PREVIEW_EDGE, Math.round(originalEdge / 2));
}
const CONCURRENCY = 4;

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
const SOURCE_BASE = env("NEXT_PUBLIC_IMAGE_BASE_URL").replace(/\/$/, "");
const { host, origin } = new URL(env("R2_S3_ENDPOINT"));

// --- Signed S3 requests to R2 (same SigV4 scheme as src/lib/r2.ts) ---------
const sha256 = (d) => createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => createHmac("sha256", k).update(d).digest();
const encode = (s) =>
  encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
const objectPath = (bucket, key) =>
  `/${encode(bucket)}/${key.split("/").map(encode).join("/")}`;

function sign(method, path) {
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const scope = `${amzDate.slice(0, 8)}/auto/s3/aws4_request`;
  const payloadHash = method === "PUT" ? "UNSIGNED-PAYLOAD" : sha256("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonical = [
    method,
    path,
    "",
    `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const key = ["auto", "s3", "aws4_request"].reduce(
    (k, part) => hmac(k, part),
    hmac(`AWS4${env("R2_SECRET_ACCESS_KEY")}`, amzDate.slice(0, 8)),
  );
  const signature = hmac(
    key,
    ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n"),
  ).toString("hex");
  return {
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${env("R2_ACCESS_KEY_ID")}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/** Size of an object in a new bucket, or null if it isn't there. */
async function headSize(bucket, key) {
  const path = objectPath(bucket, key);
  const res = await fetch(origin + path, { method: "HEAD", headers: sign("HEAD", path) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HEAD ${bucket}/${key}: ${res.status}`);
  return Number(res.headers.get("content-length"));
}

async function put(bucket, key, body, contentType, cacheControl) {
  const path = objectPath(bucket, key);
  const res = await fetch(origin + path, {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType, "Cache-Control": cacheControl, ...sign("PUT", path) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PUT ${bucket}/${key}: ${res.status} ${text.match(/<Code>([^<]+)</)?.[1] ?? ""}`);
  }
}

const sourceUrl = (key) =>
  `${SOURCE_BASE}/${key.split("/").map(encodeURIComponent).join("/")}`;

async function withRetry(label, fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`  retrying ${label} (${error.message})`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

// --- Work ------------------------------------------------------------------
function productKeys() {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "pixelorpaper-orders", REMOTE ? "--remote" : "--local", "--json",
      "--command", `"SELECT image_key FROM products ORDER BY image_key"`],
    { cwd: ROOT, encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  const parsed = JSON.parse(out);
  return parsed[parsed.length - 1].results.map((r) => r.image_key);
}

function previewFormat(key) {
  const ext = key.split(".").pop().toLowerCase();
  if (ext === "png") return { type: "image/png", apply: (img) => img.png({ compressionLevel: 9 }) };
  if (ext === "webp") return { type: "image/webp", apply: (img) => img.webp({ quality: 82 }) };
  return { type: "image/jpeg", apply: (img) => img.jpeg({ quality: 82, mozjpeg: true }) };
}

/** A preview (size from previewEdge), upright, without camera metadata. */
async function makePreview(key, original) {
  const format = previewFormat(key);
  const meta = await sharp(original, { limitInputPixels: false }).metadata();
  const edge = previewEdge(Math.max(meta.width, meta.height));
  const image = sharp(original, { limitInputPixels: false })
    .rotate()
    .resize({
      width: edge,
      height: edge,
      fit: "inside",
      withoutEnlargement: true,
    });
  const { data, info } = await format.apply(image).toBuffer({ resolveWithObject: true });
  return { data, info, type: format.type };
}

async function processKey(key, stats) {
  const [copied, previewed] = await Promise.all([
    headSize(ORIGINALS_BUCKET, key),
    headSize(PREVIEWS_BUCKET, key),
  ]);
  const head = await withRetry(`source ${key}`, async () => {
    const res = await fetch(sourceUrl(key), { method: "HEAD" });
    if (!res.ok) throw new Error(`source ${res.status}`);
    return { size: Number(res.headers.get("content-length")), type: res.headers.get("content-type") };
  });
  stats.sourceBytes += head.size;
  const needsCopy = copied !== head.size;
  const needsPreview = previewed === null;
  if (!needsCopy && !needsPreview) {
    stats.alreadyDone++;
    return;
  }
  if (needsCopy) stats.toCopy++;
  if (needsPreview) stats.toPreview++;
  if (!APPLY) return;

  const original = await withRetry(`download ${key}`, async () => {
    const res = await fetch(sourceUrl(key));
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length !== head.size) throw new Error(`short download ${buf.length}/${head.size}`);
    return buf;
  });
  if (needsCopy) {
    await withRetry(`copy ${key}`, () =>
      put(ORIGINALS_BUCKET, key, original, head.type || "application/octet-stream", "private, no-store"),
    );
    const size = await headSize(ORIGINALS_BUCKET, key);
    if (size !== head.size) throw new Error(`original size mismatch ${size}/${head.size}`);
    stats.copied++;
  }
  if (needsPreview) {
    const preview = await makePreview(key, original);
    await withRetry(`preview ${key}`, () =>
      put(PREVIEWS_BUCKET, key, preview.data, preview.type, "public, max-age=2592000"),
    );
    stats.previewed++;
    stats.previewBytes += preview.data.length;
    stats.maxPreviewEdge = Math.max(stats.maxPreviewEdge, preview.info.width, preview.info.height);
  }
}

const keys = productKeys();
console.log(`${APPLY ? "APPLYING" : "DRY RUN (nothing is written)"}: ${keys.length} products from the ${REMOTE ? "remote" : "local"} catalog`);
console.log(`source: ${SOURCE_BASE.replace(/pub-[a-z0-9]+/, "pub-…")} (read only)`);
console.log(`targets: ${ORIGINALS_BUCKET} (private), ${PREVIEWS_BUCKET} (public)`);
console.log(`previews: ${PREVIEW_LONG_EDGE}px, or half size (min ${MIN_PREVIEW_EDGE}px) for originals up to ${PREVIEW_LONG_EDGE}px\n`);

const stats = {
  sourceBytes: 0, alreadyDone: 0, toCopy: 0, toPreview: 0,
  copied: 0, previewed: 0, previewBytes: 0, maxPreviewEdge: 0,
};
const failures = [];
let next = 0, done = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < keys.length) {
      const key = keys[next++];
      try {
        await processKey(key, stats);
      } catch (error) {
        failures.push(`${key}: ${error.message}`);
      }
      if (++done % 50 === 0 || done === keys.length) console.log(`  ${done}/${keys.length} checked`);
    }
  }),
);

// A few sample previews (in memory only) so the dry run shows the result.
if (!APPLY) {
  console.log("\nSample previews (generated in memory, not uploaded):");
  for (const key of keys.filter((_, i) => i % Math.ceil(keys.length / 3) === 0).slice(0, 3)) {
    const original = Buffer.from(await (await fetch(sourceUrl(key))).arrayBuffer());
    const meta = await sharp(original, { limitInputPixels: false }).metadata();
    const preview = await makePreview(key, original);
    console.log(`  ${key}: ${meta.width}×${meta.height}, ${(original.length / 1e6).toFixed(1)} MB → ${preview.info.width}×${preview.info.height}, ${(preview.data.length / 1e3).toFixed(0)} KB`);
  }
}

const mb = (b) => `${(b / 1e6).toFixed(0)} MB`;
console.log(`\nOriginals in source: ${keys.length - failures.length} (${mb(stats.sourceBytes)})`);
console.log(`Already done: ${stats.alreadyDone}`);
console.log(`Originals to copy: ${stats.toCopy}${APPLY ? `, copied: ${stats.copied}` : ""}`);
console.log(`Previews to make: ${stats.toPreview}${APPLY ? `, made: ${stats.previewed} (${mb(stats.previewBytes)}, largest edge ${stats.maxPreviewEdge}px)` : ""}`);
if (failures.length) {
  console.log(`\n${failures.length} failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
