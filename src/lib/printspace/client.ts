import type { DeliveryFields, VariantSpec } from "@/lib/printspace/rules";

// Minimal client for theprintspace's creativehub API (v1).
// Docs: https://sell.creativehub.io/api-docs. Limits: 120 reads and 30
// writes a minute. There's no sandbox: createOrder is printed and billed.

const BASE_URL = "https://escher-v2.creativehub.io/v1";

/** An error response from the API, with its status and message. */
export class PrintspaceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PrintspaceError";
  }
}

function token() {
  const value = process.env.PRINTSPACE_API_TOKEN;
  if (!value) throw new Error("PRINTSPACE_API_TOKEN is not set");
  return value;
}

/** The API's error text: `detail`, or `message` with its `error_code`. */
function errorMessage(status: number, body: string) {
  try {
    const json = JSON.parse(body) as {
      detail?: unknown;
      message?: string;
      error_code?: string;
    };
    if (json.message) {
      return json.error_code ? `${json.error_code}: ${json.message}` : json.message;
    }
    if (json.detail) {
      return typeof json.detail === "string"
        ? json.detail
        : JSON.stringify(json.detail);
    }
  } catch {
    // Not JSON: fall through to the raw text.
  }
  return `HTTP ${status}${body ? `: ${body.slice(0, 200)}` : ""}`;
}

/** One API call, retried after a pause when rate limited (429). */
async function call<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token()}`,
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 429 && attempt < 2) {
      const wait = Number(response.headers.get("retry-after")) || 2 ** attempt * 2;
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      continue;
    }
    const text = await response.text();
    if (!response.ok) {
      throw new PrintspaceError(response.status, errorMessage(response.status, text));
    }
    return (text ? JSON.parse(text) : {}) as T;
  }
}

export type Upload = { id: string; name: string; image_type: string };

/** One page of the images uploaded to creativehub, newest first. */
export function listUploads(limit = 200, offset = 0) {
  return call<{ uploads: Upload[] }>(
    "GET",
    `/uploads?limit=${limit}&offset=${offset}`,
  );
}

export function createDrop(title: string) {
  return call<{ id: string }>("POST", "/drops", {
    title,
    create_early_access_page: false,
  });
}

/** Adds an artwork to a drop as an open edition with no certificate. */
export function addDropProduct(
  dropId: string,
  product: { upload_id: string; title: string },
) {
  return call<{ id: string }>("POST", `/drops/${dropId}/products`, {
    ...product,
    is_limited_edition: false,
    coa_type: 0,
  });
}

export function replaceVariants(
  dropId: string,
  productId: string,
  variants: VariantSpec[],
) {
  return call<unknown>(
    "PUT",
    `/drops/${dropId}/products/${productId}/variants`,
    { variants },
  );
}

export type Variant = {
  id: string;
  print_width_mm: number;
  print_height_mm: number;
  is_framed: boolean;
};

export function getVariants(productId: string) {
  return call<{ variants: Variant[] }>("GET", `/products/${productId}/variants`);
}

export type OrderItem = { variant_id: string; quantity: number };

/** Prices are in pounds. */
export type Quote = {
  currency: string;
  total_incl_vat: number;
  total_excl_vat: number;
  production_cost: number;
  delivery_cost: number;
};

/** What theprintspace would bill for an order. Free; places nothing. */
export function quoteOrder(items: OrderItem[], countryCode: string) {
  return call<Quote>("POST", "/orders/quote", {
    items,
    delivery_country_code: countryCode,
  });
}

/** Places a real order: printed, posted and billed to the account's card. */
export function createOrder(items: OrderItem[], delivery: DeliveryFields) {
  return call<{ order_id: string; order_number: string; total_incl_vat: number }>(
    "POST",
    "/orders",
    { items, ...delivery },
  );
}

export type PrintspaceOrder = {
  order_number?: string;
  status?: string;
  date_due?: string | null;
};

export function getOrder(orderId: string) {
  return call<PrintspaceOrder>("GET", `/orders/${orderId}`);
}
