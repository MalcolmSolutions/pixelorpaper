import "server-only";

const cloudflareRequestContextSymbol = Symbol.for(
  "__cloudflare-request-context__",
);

type CloudflareRequestContext = {
  env?: Record<string, unknown>;
};

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

  const context = (globalThis as Record<PropertyKey, unknown>)[
    cloudflareRequestContextSymbol
  ] as CloudflareRequestContext | undefined;

  if (!context) {
    return undefined;
  }

  const envRecord = context.env;
  if (!envRecord) {
    return undefined;
  }

  return clean(envRecord[name]);
}
