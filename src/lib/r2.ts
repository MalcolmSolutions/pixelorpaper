import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { getServerEnv } from "@/lib/server-env";

export function resolveR2Config(): { bucket: string; endpoint: string } | null {
  const explicitEndpoint = getServerEnv("R2_S3_ENDPOINT");
  const accountId = getServerEnv("R2_ACCOUNT_ID");

  if (explicitEndpoint) {
    try {
      const parsed = new URL(explicitEndpoint);
      const bucketFromPath = parsed.pathname.split("/").filter(Boolean)[0];
      const endpoint = `${parsed.protocol}//${parsed.host}`;
      const bucket = getServerEnv("R2_BUCKET_NAME") ?? bucketFromPath;

      if (!bucket) {
        return null;
      }

      return { bucket, endpoint };
    } catch {
      return null;
    }
  }

  if (!accountId) {
    return null;
  }

  return {
    bucket: getServerEnv("R2_BUCKET_NAME") ?? "base44-images",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function createR2Client(): S3Client | null {
  const accessKeyId = getServerEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getServerEnv("R2_SECRET_ACCESS_KEY");
  const resolved = resolveR2Config();

  // Skip R2 entirely on edge runtime (DOMParser not available for XML parsing)
  // Cloudflare edge exposes crypto, so we can detect it this way
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof Uint8Array !== "undefined"
  ) {
    // Likely edge runtime - DOMParser won't be available
    return null;
  }

  if (!resolved || !accessKeyId || !secretAccessKey) {
    return null;
  }

  try {
    return new S3Client({
      region: "auto",
      endpoint: resolved.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  } catch (error) {
    // If S3Client construction fails (DOMParser error or other), return null
    console.warn("[createR2Client] S3Client construction failed:", error);
    return null;
  }
}
