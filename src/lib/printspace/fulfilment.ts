import { getDb } from "@/lib/db";
import { isDigital, getFormat, type PrintSizeName } from "@/lib/print-sizes";
import {
  addDropProduct,
  createDrop,
  createOrder,
  getOrder,
  getVariants,
  listUploads,
  PrintspaceError,
  quoteOrder,
  replaceVariants,
  type OrderItem,
} from "@/lib/printspace/client";
import {
  deliveryFields,
  fulfilmentMode,
  isUploadFor,
  jobStatusFor,
  passesCostCheck,
  penceFromPounds,
  variantSpecs,
} from "@/lib/printspace/rules";
import type { Order, OrderItem as OurOrderItem } from "@/types/order";

// Sends paid print orders to theprintspace. Each order with prints gets one
// print job (table print_jobs). A job is taken by one worker at a time
// (status 'sending'), set up and priced at theprintspace, checked against
// what the customer paid, and then, in live mode only, placed. Placed jobs
// are checked until theprintspace reports them dispatched, which marks the
// order fulfilled. Anything that needs a person is 'held' with a reason.

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
/** A worker that took a job this long ago has died; it can be taken again. */
const STALE_LOCK = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 minutes')";
const MAX_ATTEMPTS = 3;
const DROP_TITLE = "Pixel or Paper store";

export const getMode = () =>
  fulfilmentMode(process.env.PRINTSPACE_MODE, process.env.SITE_URL);

export type PrintJobStatus =
  | "queued"
  | "sending"
  | "held"
  | "quoted"
  | "submitted"
  | "dispatched"
  | "failed"
  | "cancelled";

export type PrintJob = {
  order_id: string;
  status: PrintJobStatus;
  hold_reason: string | null;
  quoted_cost_pence: number | null;
  quoted_at: string | null;
  ch_order_id: string | null;
  ch_order_number: string | null;
  ch_status: string | null;
  date_due: string | null;
  attempts: number;
  last_error: string | null;
  submitted_at: string | null;
  last_checked_at: string | null;
  dispatched_at: string | null;
  created_at: string;
  updated_at: string;
};

const PRINT_LINES = "order_items.order_id = orders.id AND order_items.size <> 'DIGITAL'";

/**
 * Queues a print job for a newly paid order, from the Stripe webhook. Only
 * placed, paid, unrefunded orders with prints; nothing while fulfilment is
 * off, so orders from that time are never sent later by surprise.
 */
export async function enqueuePrintJob(orderId: string | null) {
  if (!orderId || getMode() === "off") return false;
  const db = await getDb();
  const result = await db
    .prepare(
      `INSERT INTO print_jobs (order_id)
       SELECT id FROM orders
       WHERE id = ? AND status = 'placed' AND payment_status = 'paid'
         AND refunded_at IS NULL
         AND EXISTS (SELECT 1 FROM order_items WHERE ${PRINT_LINES})
       ON CONFLICT (order_id) DO NOTHING`,
    )
    .bind(orderId)
    .run();
  return result.meta.changes > 0;
}

/**
 * Creates a held job for a paid order the webhook didn't queue (e.g. one
 * flagged for review), so the admin can send it once checked.
 */
export async function createHeldJob(orderId: string) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO print_jobs (order_id, status, hold_reason)
       SELECT id, 'held', 'Created by an admin. Check the order, then send it.'
       FROM orders
       WHERE id = ? AND status IN ('placed', 'needs_review')
         AND payment_status = 'paid' AND refunded_at IS NULL
         AND EXISTS (SELECT 1 FROM order_items WHERE ${PRINT_LINES})
       ON CONFLICT (order_id) DO NOTHING`,
    )
    .bind(orderId)
    .run();
}

export async function getPrintJob(orderId: string) {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM print_jobs WHERE order_id = ?")
    .bind(orderId)
    .first<PrintJob>();
}

/** Recent jobs with their order reference, newest first. */
export async function listPrintJobs(limit = 100) {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT print_jobs.*, orders.reference, orders.customer_name
       FROM print_jobs JOIN orders ON orders.id = print_jobs.order_id
       ORDER BY print_jobs.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<PrintJob & { reference: string; customer_name: string | null }>();
  return results;
}

/** Whether the API token works, for the admin page. */
export async function checkConnection(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await listUploads(1);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

// --- Processing ------------------------------------------------------------

type JobOutcome = Pick<
  PrintJob,
  "status" | "hold_reason" | "last_error"
> &
  Partial<
    Pick<
      PrintJob,
      "quoted_cost_pence" | "ch_order_id" | "ch_order_number" | "ch_status"
    >
  >;

/** A job held for the admin: never retried automatically. */
class Hold extends Error {}

/**
 * Takes a job and works it as far as the mode allows. `override` is an
 * admin's "send anyway": it also takes held, failed and quoted jobs, and
 * skips the review and cost checks (never the refund check).
 */
export async function processJob(
  orderId: string,
  { override = false }: { override?: boolean } = {},
) {
  const mode = getMode();
  if (mode === "off") return;
  const db = await getDb();

  const taken = await db
    .prepare(
      `UPDATE print_jobs
       SET status = 'sending', locked_at = ${NOW}, attempts = attempts + 1
       WHERE order_id = ?
         AND (status = 'queued'
              OR (status = 'sending' AND locked_at < ${STALE_LOCK})
              OR (? AND status IN ('held', 'failed', 'quoted')))`,
    )
    .bind(orderId, override ? 1 : 0)
    .run();
  if (taken.meta.changes === 0) return;

  const job = (await getPrintJob(orderId))!;
  let outcome: JobOutcome;
  try {
    outcome = await work(orderId, mode, override);
  } catch (error) {
    const message = describeError(error);
    if (error instanceof Hold) {
      outcome = { status: "held", hold_reason: message, last_error: null };
    } else if (mode === "live" && error instanceof UncertainOrder) {
      outcome = { status: "held", hold_reason: message, last_error: message };
    } else {
      const giveUp = override || job.attempts >= MAX_ATTEMPTS;
      console.error(`Print job for order ${orderId} failed`, error);
      outcome = {
        status: giveUp ? "failed" : "queued",
        hold_reason: giveUp
          ? "Couldn't reach an answer from theprintspace. See the error, then send it again."
          : null,
        last_error: message,
      };
    }
  }
  await saveOutcome(orderId, outcome);
}

async function saveOutcome(orderId: string, o: JobOutcome) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE print_jobs SET
         status = ?, hold_reason = ?, last_error = ?, locked_at = NULL,
         quoted_cost_pence = coalesce(?, quoted_cost_pence),
         quoted_at = CASE WHEN ? IS NOT NULL THEN ${NOW} ELSE quoted_at END,
         ch_order_id = coalesce(?, ch_order_id),
         ch_order_number = coalesce(?, ch_order_number),
         ch_status = coalesce(?, ch_status),
         submitted_at = CASE WHEN ? = 'submitted' THEN ${NOW} ELSE submitted_at END
       WHERE order_id = ? AND status = 'sending'`,
    )
    .bind(
      o.status,
      o.hold_reason,
      o.last_error,
      o.quoted_cost_pence ?? null,
      o.quoted_cost_pence ?? null,
      o.ch_order_id ?? null,
      o.ch_order_number ?? null,
      o.ch_status ?? null,
      o.status,
      orderId,
    )
    .run();
}

/** createOrder failed in a way that doesn't say whether it was placed. */
class UncertainOrder extends Error {}

async function work(
  orderId: string,
  mode: "quote" | "live",
  override: boolean,
): Promise<JobOutcome> {
  const db = await getDb();
  const order = await db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .bind(orderId)
    .first<Order>();
  if (!order) throw new Hold("The order no longer exists.");
  if (order.refunded_at || order.payment_status !== "paid") {
    return {
      status: "cancelled",
      hold_reason: "The order isn't paid or was refunded, so it won't be printed.",
      last_error: null,
    };
  }
  if (order.status !== "placed" && !(override && order.status === "needs_review")) {
    throw new Hold(
      order.status === "needs_review"
        ? "The order is flagged for review. Check it, then send it."
        : `The order's status is ${order.status}, so it isn't sent.`,
    );
  }

  const delivery = deliveryFields(order.shipping_address, order.customer_email);
  if (!delivery) throw new Hold("The delivery address is missing or incomplete.");

  const { results } = await db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .bind(orderId)
    .all<OurOrderItem>();
  const prints = results.filter((item) => {
    const format = getFormat(item.size);
    return format && !isDigital(format);
  });
  if (prints.length === 0) {
    return { status: "cancelled", hold_reason: "The order has no prints.", last_error: null };
  }

  const items: OrderItem[] = [];
  const missing: string[] = [];
  for (const line of prints) {
    const variants = await ensureVariants(line.product_id);
    if (!variants) {
      missing.push(line.product_name);
      continue;
    }
    items.push({
      variant_id: variants[line.size as PrintSizeName],
      quantity: line.quantity,
    });
  }
  if (missing.length > 0) {
    throw new Hold(
      `Artwork not uploaded to creativehub yet: ${missing.join(", ")}. Upload the original with the same file name, then send it again.`,
    );
  }

  const quote = await quoteOrder(items, delivery.delivery_country_code);
  const cost = penceFromPounds(quote.total_incl_vat);
  const revenue = prints.reduce((sum, line) => sum + line.line_total_pence, 0);
  if (!override && !passesCostCheck(cost, revenue)) {
    return {
      status: "held",
      hold_reason: `theprintspace would charge £${(cost / 100).toFixed(2)}, more than the £${(revenue / 100).toFixed(2)} the customer paid for the prints.`,
      last_error: null,
      quoted_cost_pence: cost,
    };
  }
  if (mode === "quote") {
    return {
      status: "quoted",
      hold_reason: null,
      last_error: null,
      quoted_cost_pence: cost,
    };
  }

  let placed;
  try {
    placed = await createOrder(items, delivery);
  } catch (error) {
    // A 4xx means it was refused, so nothing was placed and it can be
    // retried. Anything else (timeout, 5xx) might have placed it.
    if (error instanceof PrintspaceError && error.status < 500) throw error;
    throw new UncertainOrder(
      `Sending may or may not have worked (${describeError(error)}). Check the orders in creativehub before sending it again.`,
    );
  }
  return {
    status: "submitted",
    hold_reason: null,
    last_error: null,
    quoted_cost_pence: cost,
    ch_order_id: placed.order_id,
    ch_order_number: placed.order_number,
  };
}

// --- Products at theprintspace ---------------------------------------------

/**
 * theprintspace's variant id for each size of a print, setting the print up
 * there on its first order. Null if its artwork hasn't been uploaded to
 * creativehub (artwork can't be uploaded through the API).
 */
async function ensureVariants(
  productId: string,
): Promise<Record<PrintSizeName, string> | null> {
  const db = await getDb();
  const known = await variantsFor(productId);
  if (known) return known;

  const product = await db
    .prepare(
      "SELECT id, name, image_key, image_width, image_height FROM products WHERE id = ?",
    )
    .bind(productId)
    .first<{
      id: string;
      name: string;
      image_key: string;
      image_width: number;
      image_height: number;
    }>();
  if (!product) throw new Hold(`The print ${productId} is no longer in the catalogue.`);

  const upload = await findUpload(product.image_key);
  if (!upload) return null;

  const { results: priceRows } = await db
    .prepare("SELECT size, price_pence FROM product_prices WHERE product_id = ?")
    .bind(productId)
    .all<{ size: PrintSizeName; price_pence: number }>();
  const prices = Object.fromEntries(
    priceRows.map((row) => [row.size, row.price_pence]),
  ) as Record<PrintSizeName, number>;
  const specs = variantSpecs(
    { width: product.image_width, height: product.image_height },
    prices,
  );

  const dropId = await storeDropId();
  const chProduct = await addDropProduct(dropId, {
    upload_id: upload.id,
    title: product.name,
  });
  await replaceVariants(dropId, chProduct.id, specs);
  const { variants } = await getVariants(chProduct.id);

  const ids = {} as Record<PrintSizeName, string>;
  for (const spec of specs) {
    const match = variants.find(
      (v) =>
        !v.is_framed &&
        Math.round(v.print_width_mm) === spec.print_width_mm &&
        Math.round(v.print_height_mm) === spec.print_height_mm,
    );
    if (!match) {
      throw new Error(
        `theprintspace didn't return a ${spec.size_label} variant for ${product.name}`,
      );
    }
    ids[spec.size_label] = match.id;
  }

  await db.batch([
    db
      .prepare(
        `INSERT INTO printspace_products (product_id, ch_upload_id, ch_product_id)
         VALUES (?, ?, ?)
         ON CONFLICT (product_id) DO UPDATE SET
           ch_upload_id = excluded.ch_upload_id,
           ch_product_id = excluded.ch_product_id`,
      )
      .bind(productId, upload.id, chProduct.id),
    ...specs.map((spec) =>
      db
        .prepare(
          `INSERT INTO printspace_variants (product_id, size, ch_variant_id)
           VALUES (?, ?, ?)
           ON CONFLICT (product_id, size) DO UPDATE SET
             ch_variant_id = excluded.ch_variant_id`,
        )
        .bind(productId, spec.size_label, ids[spec.size_label]),
    ),
  ]);
  return ids;
}

async function variantsFor(productId: string) {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT size, ch_variant_id FROM printspace_variants WHERE product_id = ?")
    .bind(productId)
    .all<{ size: PrintSizeName; ch_variant_id: string }>();
  if (results.length < 4) return null;
  return Object.fromEntries(
    results.map((row) => [row.size, row.ch_variant_id]),
  ) as Record<PrintSizeName, string>;
}

/** The artwork uploaded for an image key, searched by file name. */
async function findUpload(imageKey: string) {
  const pageSize = 200;
  for (let offset = 0; offset < 5000; offset += pageSize) {
    const { uploads } = await listUploads(pageSize, offset);
    const match = uploads.find(
      (u) => u.image_type === "artwork" && isUploadFor(u.name, imageKey),
    );
    if (match) return match;
    if (uploads.length < pageSize) return null;
  }
  return null;
}

/** The draft drop our products live in, created on first use. */
async function storeDropId() {
  const db = await getDb();
  const saved = await db
    .prepare("SELECT value FROM printspace_settings WHERE key = 'drop_id'")
    .first<{ value: string }>();
  if (saved) return saved.value;
  const drop = await createDrop(DROP_TITLE);
  await db
    .prepare(
      `INSERT INTO printspace_settings (key, value) VALUES ('drop_id', ?)
       ON CONFLICT (key) DO NOTHING`,
    )
    .bind(drop.id)
    .run();
  // Another worker may have saved one first: use whichever was kept.
  return (await db
    .prepare("SELECT value FROM printspace_settings WHERE key = 'drop_id'")
    .first<{ value: string }>())!.value;
}

// --- Progress --------------------------------------------------------------

/**
 * Checks a placed order's progress. Dispatched marks our order fulfilled;
 * cancelled at theprintspace is shown to the admin.
 */
export async function refreshJob(orderId: string) {
  const job = await getPrintJob(orderId);
  if (!job?.ch_order_id || job.status !== "submitted") return;
  const db = await getDb();
  const remote = await getOrder(job.ch_order_id);
  const next = jobStatusFor(remote.status);

  const updateJob = db
    .prepare(
      `UPDATE print_jobs SET
         status = ?, ch_status = ?, date_due = coalesce(?, date_due),
         ch_order_number = coalesce(?, ch_order_number),
         last_checked_at = ${NOW},
         dispatched_at = CASE WHEN ? = 'dispatched' THEN ${NOW} ELSE dispatched_at END,
         hold_reason = CASE WHEN ? = 'cancelled'
                            THEN 'Cancelled at theprintspace.' ELSE hold_reason END
       WHERE order_id = ? AND status = 'submitted'`,
    )
    .bind(
      next,
      remote.status ?? null,
      remote.date_due ?? null,
      remote.order_number ?? null,
      next,
      next,
      orderId,
    );
  if (next !== "dispatched") {
    await updateJob.run();
    return;
  }
  await db.batch([
    updateJob,
    db
      .prepare(
        `UPDATE orders SET status = 'fulfilled'
         WHERE id = ? AND status IN ('placed', 'needs_review')
           AND payment_status = 'paid'`,
      )
      .bind(orderId),
  ]);
}

/**
 * The cron's work: send queued jobs (and any whose worker died), then check
 * placed orders not looked at for half an hour. Small batches, well inside
 * theprintspace's rate limits.
 */
export async function runScheduledFulfilment() {
  if (getMode() === "off") return;
  const db = await getDb();
  const { results: toSend } = await db
    .prepare(
      `SELECT order_id FROM print_jobs
       WHERE status = 'queued' OR (status = 'sending' AND locked_at < ${STALE_LOCK})
       ORDER BY created_at LIMIT 10`,
    )
    .all<{ order_id: string }>();
  for (const { order_id } of toSend) await processJob(order_id);

  const { results: toCheck } = await db
    .prepare(
      `SELECT order_id FROM print_jobs
       WHERE status = 'submitted'
         AND (last_checked_at IS NULL
              OR last_checked_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 minutes'))
       ORDER BY last_checked_at LIMIT 20`,
    )
    .all<{ order_id: string }>();
  for (const { order_id } of toCheck) {
    try {
      await refreshJob(order_id);
    } catch (error) {
      console.error(`Couldn't check print job for order ${order_id}`, error);
    }
  }
}

/** Marks a job cancelled, e.g. after cancelling it with theprintspace. */
export async function cancelJob(orderId: string) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE print_jobs SET status = 'cancelled', locked_at = NULL,
         hold_reason = 'Marked cancelled by an admin.'
       WHERE order_id = ? AND status NOT IN ('dispatched', 'cancelled', 'sending')`,
    )
    .bind(orderId)
    .run();
}

function describeError(error: unknown) {
  if (error instanceof PrintspaceError) {
    return `theprintspace said ${error.message} (HTTP ${error.status})`;
  }
  return error instanceof Error ? error.message : String(error);
}
