import "server-only";

import { AwsClient } from "aws4fetch";
import { resolveR2Config } from "@/lib/r2";
import { getServerEnv } from "@/lib/server-env";
import {
  productCategories,
  type Product,
  type ProductCategory,
} from "@/types/product";

const imageExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "tif",
  "tiff",
]);

const customerPriceIncreaseCents = 420;

// Cache products for 5 minutes (300,000 ms) to avoid repeated R2 calls
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedProducts: Product[] | null = null;
let cacheExpireTime = 0;

function debugLog(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.log(message, ...args);
  }
}

function getCachedProducts(): Product[] | null {
  if (cachedProducts && Date.now() < cacheExpireTime) {
    return cachedProducts;
  }
  cachedProducts = null;
  return null;
}

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategory(segment: string): ProductCategory {
  const lowered = segment.toLowerCase();

  if (lowered === "landscape" || lowered === "landscapes") {
    return "Landscapes";
  }
  if (lowered === "cityscape" || lowered === "cityscapes") {
    return "Cityscapes";
  }
  if (lowered === "building" || lowered === "buildings") {
    return "Buildings";
  }
  if (lowered === "nature") {
    return "Nature";
  }

  return "Misc";
}

function keyToImagePath(key: string): string {
  return `/${key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? `${trimmed}/` : "";
}

export function imagePathToKey(imagePath: string): string {
  return decodeURIComponent(imagePath.replace(/^\/+/, ""));
}

function toProductFromKey(
  key: string,
  previewPrefix: string,
  originalPrefix: string,
): Product | null {
  const relativeKey =
    previewPrefix && key.startsWith(previewPrefix)
      ? key.slice(previewPrefix.length)
      : key;
  const parts = relativeKey.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const fileName = parts[parts.length - 1];
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!imageExtensions.has(extension)) {
    return null;
  }

  const baseName = fileName.replace(/\.[^.]+$/, "");
  const category = normalizeCategory(parts[0]);
  const title = toTitleCase(baseName);
  const defaultPrice = Number.parseInt(
    process.env.DEFAULT_PRODUCT_PRICE_CENTS ?? "2500",
    10,
  );
  const customerPrice = Number.isFinite(defaultPrice)
    ? defaultPrice + customerPriceIncreaseCents
    : 2500 + customerPriceIncreaseCents;
  const derivedId = toSlug(key);
  const downloadKey =
    previewPrefix && originalPrefix && key.startsWith(previewPrefix)
      ? `${originalPrefix}${key.slice(previewPrefix.length)}`
      : key;

  return {
    id: derivedId || `${toSlug(category)}-${toSlug(baseName)}`,
    title,
    artist: process.env.DEFAULT_PRODUCT_ARTIST ?? "UNFRAMED Archive",
    description: `Fine art print from the ${category} collection.`,
    category,
    priceCents: customerPrice,
    image: keyToImagePath(key),
    downloadKey,
    size: process.env.DEFAULT_PRINT_SIZE ?? "24 x 16 in",
  };
}

async function listAllKeys(
  endpoint: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<string[]> {
  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const url = new URL(endpoint);
    url.pathname = `/${bucket}`;
    url.searchParams.set("list-type", "2");
    url.searchParams.set("max-keys", "1000");

    if (continuationToken) {
      url.searchParams.set("continuation-token", continuationToken);
    }

    debugLog("[listAllKeys] Request URL:", url.toString().substring(0, 150));
    const response = await aws.fetch(url.toString(), { method: "GET" });
    debugLog("[listAllKeys] Response status:", response.status);
    if (!response.ok) {
      throw new Error(`R2 list request failed with ${response.status}`);
    }

    const xml = await response.text();
    debugLog(
      "[listAllKeys] XML length:",
      xml.length,
      "bytes, first 300 chars:",
      xml.substring(0, 300),
    );
    for (const match of xml.matchAll(/<Key>(.*?)<\/Key>/g)) {
      const key = decodeURIComponent(match[1])
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&apos;", "'");
      keys.push(key);
    }
    debugLog("[listAllKeys] Keys found in this batch:", keys.length);

    const tokenMatch = xml.match(
      /<NextContinuationToken>(.*?)<\/NextContinuationToken>/,
    );
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    continuationToken = truncated ? tokenMatch?.[1] : undefined;
  } while (continuationToken);

  debugLog("[listAllKeys] Total keys retrieved:", keys.length);
  return keys;
}

async function listAllKeysWithTimeoutAndRetry(
  endpoint: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<string[]> {
  const timeoutMs = Number.parseInt(
    getServerEnv("R2_LIST_TIMEOUT_MS") ?? "15000",
    10,
  );
  const effectiveTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000;

  const fetchWithTimeout = async (): Promise<string[]> => {
    const timeoutPromise: Promise<never> = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`R2 request timeout after ${effectiveTimeoutMs}ms`)),
        effectiveTimeoutMs,
      ),
    );

    return Promise.race([
      listAllKeys(endpoint, bucket, accessKeyId, secretAccessKey),
      timeoutPromise,
    ]);
  };

  try {
    return await fetchWithTimeout();
  } catch (firstError: unknown) {
    const firstMessage =
      firstError instanceof Error ? firstError.message : String(firstError);
    console.warn(
      "[getCatalogProducts] First R2 list attempt failed:",
      firstMessage,
    );

    // One retry for cold starts/transient network jitter on edge runtime.
    await new Promise((resolve) => setTimeout(resolve, 400));

    return fetchWithTimeout();
  }
}

export async function getCatalogProducts(): Promise<Product[]> {
  // Return cached products if available
  const cached = getCachedProducts();
  if (cached) {
    return cached;
  }

  const resolved = resolveR2Config();
  const accessKeyId = getServerEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getServerEnv("R2_SECRET_ACCESS_KEY");
  const previewPrefix = normalizePrefix(
    getServerEnv("R2_PUBLIC_PREVIEW_PREFIX") ?? "",
  );
  const originalPrefix = normalizePrefix(
    getServerEnv("R2_PRIVATE_ORIGINAL_PREFIX") ?? "",
  );

  debugLog(
    "[getCatalogProducts] R2 Config resolved:",
    resolved ? `✓ bucket=${resolved.bucket}` : "✗ null",
  );
  debugLog(
    "[getCatalogProducts] R2 Env vars:",
    `ACCESS_KEY=${accessKeyId ? "✓" : "✗"}, SECRET=${secretAccessKey ? "✓" : "✗"}, ENDPOINT=${resolved?.endpoint ? "✓" : "✗"}`,
  );

  if (!resolved || !accessKeyId || !secretAccessKey) {
    console.error("[getCatalogProducts] R2 is required but not configured");
    return [];
  }

  try {
    let keys: string[];
    try {
      keys = await listAllKeysWithTimeoutAndRetry(
        resolved.endpoint,
        resolved.bucket,
        accessKeyId,
        secretAccessKey,
      );
    } catch (timeoutOrError: unknown) {
      const error = timeoutOrError as Error;
      debugLog(
        "[getCatalogProducts] R2 request failed:",
        error.message || String(error),
      );
      return [];
    }

    const previewKeys = previewPrefix
      ? keys.filter((key) => key.startsWith(previewPrefix))
      : keys;
    debugLog(
      "[getCatalogProducts] Preview keys after prefix filter:",
      previewPrefix ? `${previewKeys.length} of ${keys.length}` : "all",
    );
    const products = previewKeys
      .map((key) => toProductFromKey(key, previewPrefix, originalPrefix))
      .filter((product): product is Product => Boolean(product))
      .sort((a, b) => {
        const categoryDiff =
          productCategories.indexOf(a.category) -
          productCategories.indexOf(b.category);
        if (categoryDiff !== 0) {
          return categoryDiff;
        }

        return a.title.localeCompare(b.title);
      });
    debugLog(
      "[getCatalogProducts] Products created after filtering:",
      products.length,
    );

    const seenIds = new Map<string, number>();
    const uniqueProducts = products.map((product) => {
      const current = seenIds.get(product.id) ?? 0;
      seenIds.set(product.id, current + 1);

      if (current === 0) {
        return product;
      }

      return {
        ...product,
        id: `${product.id}-${current + 1}`,
      };
    });

    const result = uniqueProducts;

    // Cache the result with TTL
    cachedProducts = result;
    cacheExpireTime = Date.now() + CACHE_TTL_MS;

    return result;
  } catch (error) {
    console.error("Failed to load products from R2", error);
    return [];
  }
}
