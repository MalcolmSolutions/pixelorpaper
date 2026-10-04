import { createHash, createHmac } from "node:crypto";

// Minimal Cloudflare R2 client over the S3 API (AWS Signature V4).
// Server code reads the bucket only through the signed API: the public
// r2.dev URL rate-limits bulk reads (HTTP 429) and is for browsers only.

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const sha256 = (data: string) =>
  createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) =>
  createHmac("sha256", key).update(data).digest();

/** RFC 3986 encoding, as required for SigV4 canonical requests. */
const encode = (s: string) =>
  encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** SigV4 headers for a GET of `path?query` (signed fresh on each call). */
function signGet(host: string, path: string, query: string) {
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const scope = `${amzDate.slice(0, 8)}/auto/s3/aws4_request`;
  const payloadHash = sha256("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "GET",
    path,
    query,
    `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const signingKey = ["auto", "s3", "aws4_request"].reduce(
    (key, part) => hmac(key, part),
    hmac(`AWS4${env("R2_SECRET_ACCESS_KEY")}`, amzDate.slice(0, 8)),
  );
  const signature = hmac(signingKey, stringToSign).toString("hex");

  return {
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${env("R2_ACCESS_KEY_ID")}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/**
 * Signed GET, retried with backoff on rate limiting and server errors.
 * Extra headers (e.g. Range) are sent unsigned. Throws if it never succeeds.
 */
async function signedGet(
  path: string,
  params: Record<string, string> = {},
  headers: Record<string, string> = {},
): Promise<Response> {
  const { host, origin } = new URL(env("R2_S3_ENDPOINT"));
  const query = Object.keys(params)
    .sort()
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join("&");
  const url = query ? `${origin}${path}?${query}` : `${origin}${path}`;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { ...headers, ...signGet(host, path, query) },
    });
    if (res.ok) return res;

    const retryable = res.status === 429 || res.status >= 500;
    await res.body?.cancel();
    if (!retryable || attempt === 4) {
      throw new Error(`R2 request failed: ${res.status} ${path}`);
    }
    await new Promise((r) =>
      setTimeout(r, 250 * 2 ** attempt + Math.random() * 250),
    );
  }
}

const bucketPath = () => `/${encode(env("R2_BUCKET_NAME"))}`;

/** Every object key in the bucket. */
export async function listObjectKeys(): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const params: Record<string, string> = {
      "list-type": "2",
      "max-keys": "1000",
    };
    if (token) params["continuation-token"] = token;

    const xml = await (await signedGet(bucketPath(), params)).text();
    for (const [, key] of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) {
      keys.push(decodeXml(key));
    }
    const next = xml.match(/<NextContinuationToken>([^<]*)</)?.[1];
    token = next ? decodeXml(next) : undefined;
  } while (token);

  return keys;
}

/** Read an object, or only its first `bytes` bytes. */
export async function getObject(
  key: string,
  bytes?: number,
): Promise<Response> {
  const path = `${bucketPath()}/${key.split("/").map(encode).join("/")}`;
  return signedGet(path, {}, bytes ? { Range: `bytes=0-${bytes - 1}` } : {});
}

/** Public URL for an object key (for browsers and the image optimiser). */
export function publicUrl(key: string) {
  const base = env("NEXT_PUBLIC_IMAGE_BASE_URL").replace(/\/$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
