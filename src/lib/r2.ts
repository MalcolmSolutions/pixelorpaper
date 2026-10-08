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

/** SigV4 signing key for the day of `amzDate` (YYYYMMDDTHHMMSSZ). */
const signingKey = (amzDate: string) =>
  ["auto", "s3", "aws4_request"].reduce(
    (key, part) => hmac(key, part),
    hmac(`AWS4${env("R2_SECRET_ACCESS_KEY")}`, amzDate.slice(0, 8)),
  );

/**
 * SigV4 headers for `method path?query` (signed fresh on each call). Bodies
 * are sent as UNSIGNED-PAYLOAD, which R2 accepts over HTTPS.
 */
function signRequest(
  method: "GET" | "PUT" | "DELETE",
  host: string,
  path: string,
  query: string,
) {
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const scope = `${amzDate.slice(0, 8)}/auto/s3/aws4_request`;
  const payloadHash = method === "PUT" ? "UNSIGNED-PAYLOAD" : sha256("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
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

  const signature = hmac(signingKey(amzDate), stringToSign).toString("hex");

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
      headers: { ...headers, ...signRequest("GET", host, path, query) },
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

/** Whether an object currently exists, read fresh from the bucket. */
export async function objectExists(key: string): Promise<boolean> {
  try {
    // Read the single byte rather than cancelling the body: cancelling can
    // stall Node's fetch, and the body is only one byte.
    await (await getObject(key, 1)).arrayBuffer();
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("R2 request failed: 404")
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Buckets this app writes to. Full-resolution originals are private (only
 * reachable through signed download links); previews are public and are
 * what the shop shows. R2_BUCKET_NAME is the older bucket the live site
 * reads from; this app only ever reads it (catalog import).
 */
export const ORIGINALS_BUCKET =
  process.env.R2_ORIGINALS_BUCKET || "pixelorpaper-originals";
export const PREVIEWS_BUCKET =
  process.env.R2_PREVIEWS_BUCKET || "pixelorpaper-previews";

const objectPath = (bucket: string, key: string) =>
  `/${encode(bucket)}/${key.split("/").map(encode).join("/")}`;

/** An upload R2 refused, with its HTTP status and S3 error code. */
export class R2UploadError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    path: string,
  ) {
    super(`R2 upload failed: ${status}${code ? ` ${code}` : ""} ${path}`);
    this.name = "R2UploadError";
  }

  /**
   * True when the credentials can't write to the bucket (read-only or wrong
   * key): retrying won't help until the R2 API token is changed.
   */
  get isPermissionProblem() {
    return (
      this.status === 401 ||
      this.status === 403 ||
      this.code === "AccessDenied" ||
      this.code === "InvalidAccessKeyId" ||
      this.code === "SignatureDoesNotMatch"
    );
  }
}

/**
 * Upload an object (e.g. an admin's product image) to one of this app's
 * buckets. Throws R2UploadError if R2 refuses it, or a network error if R2
 * can't be reached.
 */
export async function putObject(
  bucket: typeof ORIGINALS_BUCKET | typeof PREVIEWS_BUCKET,
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { host, origin } = new URL(env("R2_S3_ENDPOINT"));
  const path = objectPath(bucket, key);
  const res = await fetch(`${origin}${path}`, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": contentType,
      "Cache-Control":
        bucket === PREVIEWS_BUCKET
          ? "public, max-age=2592000"
          : "private, no-store",
      ...signRequest("PUT", host, path, ""),
    },
  });
  // Read the body rather than cancelling it (cancelling can stall Node's
  // fetch); on failure it holds S3's XML error code.
  const responseText = await res.text();
  if (!res.ok) {
    const code = responseText.match(/<Code>([^<]+)<\/Code>/)?.[1] ?? null;
    throw new R2UploadError(res.status, code, path);
  }
}

/** Delete an object from one of this app's buckets. Missing is not an error. */
export async function deleteObject(
  bucket: typeof ORIGINALS_BUCKET | typeof PREVIEWS_BUCKET,
  key: string,
): Promise<void> {
  const { host, origin } = new URL(env("R2_S3_ENDPOINT"));
  const path = objectPath(bucket, key);
  const res = await fetch(`${origin}${path}`, {
    method: "DELETE",
    headers: signRequest("DELETE", host, path, ""),
  });
  await res.arrayBuffer(); // drain (cancelling can stall Node's fetch)
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed: ${res.status} ${path}`);
  }
}

/**
 * A time-limited link to fetch one private original (SigV4 query signing).
 * The browser downloads it as `filename`; the link stops working after
 * `expiresSeconds`, so it's only handed out by the download route.
 */
export function presignedDownloadUrl(
  bucket: typeof ORIGINALS_BUCKET,
  key: string,
  expiresSeconds: number,
  filename: string,
): string {
  const { host, origin } = new URL(env("R2_S3_ENDPOINT"));
  const path = objectPath(bucket, key);
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const scope = `${amzDate.slice(0, 8)}/auto/s3/aws4_request`;
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${env("R2_ACCESS_KEY_ID")}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
    "response-cache-control": "private, no-store",
    "response-content-disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
  };
  const query = Object.keys(params)
    .sort()
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join("&");
  const canonicalRequest = [
    "GET",
    path,
    query,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = hmac(signingKey(amzDate), stringToSign).toString("hex");
  return `${origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

/**
 * Public URL of an image's web preview (for browsers and the image
 * optimiser). Originals are never linked: they're only sold as downloads.
 */
export function publicUrl(key: string) {
  const base = env("NEXT_PUBLIC_PREVIEW_BASE_URL").replace(/\/$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
