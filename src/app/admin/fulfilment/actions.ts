"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  cancelJob,
  createHeldJob,
  processJob,
  refreshJob,
} from "@/lib/printspace/fulfilment";

function orderIdFrom(formData: FormData) {
  const id = formData.get("orderId");
  return typeof id === "string" && id ? id : null;
}

/**
 * Sends (or, in quote mode, prices) a print job now. Also takes held,
 * failed and quoted jobs, skipping the review and cost checks: the admin
 * has looked at it.
 */
export async function sendPrintJob(formData: FormData) {
  await requireAdmin();
  const orderId = orderIdFrom(formData);
  if (!orderId) return;
  await processJob(orderId, { override: true });
  refresh();
}

/** Checks a placed job's progress at theprintspace now. */
export async function refreshPrintJob(formData: FormData) {
  await requireAdmin();
  const orderId = orderIdFrom(formData);
  if (!orderId) return;
  try {
    await refreshJob(orderId);
  } catch (error) {
    console.error(`Couldn't check print job for order ${orderId}`, error);
  }
  refresh();
}

/** Creates a held job for a paid order that has none. */
export async function createPrintJob(formData: FormData) {
  await requireAdmin();
  const orderId = orderIdFrom(formData);
  if (!orderId) return;
  await createHeldJob(orderId);
  refresh();
}

/** Marks a job cancelled (after cancelling it with theprintspace, if sent). */
export async function cancelPrintJob(formData: FormData) {
  await requireAdmin();
  const orderId = orderIdFrom(formData);
  if (!orderId) return;
  await cancelJob(orderId);
  refresh();
}
