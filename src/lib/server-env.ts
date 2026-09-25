import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getServerEnv(name: string): string | undefined {
  const fromProcess = clean(process.env[name]);
  if (fromProcess) {
    return fromProcess;
  }

  try {
    const context = getCloudflareContext();
    return clean((context.env as Record<string, unknown>)[name]);
  } catch {
    return undefined;
  }
}
