import {
  cancelPrintJob,
  createPrintJob,
  refreshPrintJob,
  sendPrintJob,
} from "@/app/admin/fulfilment/actions";
import { formatDateTime } from "@/components/admin/order-labels";
import { SubmitButton } from "@/components/cart/submit-button";
import type { PrintJob, PrintJobStatus } from "@/lib/printspace/fulfilment";
import type { FulfilmentMode } from "@/lib/printspace/rules";
import { formatPrice } from "@/lib/utils";

export const JOB_STATUS_LABELS: Record<PrintJobStatus, string> = {
  queued: "Queued",
  sending: "Sending",
  held: "Held for you",
  quoted: "Priced (not sent)",
  submitted: "With theprintspace",
  dispatched: "Dispatched",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const MODE_LABELS: Record<FulfilmentMode, string> = {
  off: "Off: nothing is sent",
  quote: "Quote only: priced, never placed",
  live: "Live: orders are placed and printed",
};

/**
 * An order's print job at theprintspace, with the admin's actions. Plain
 * forms; each server action checks the admin role.
 */
export function FulfilmentPanel({
  orderId,
  job,
  mode,
  canCreate,
}: {
  orderId: string;
  job: PrintJob | null;
  mode: FulfilmentMode;
  /** Whether a held job can be created (a paid order with prints). */
  canCreate: boolean;
}) {
  if (!job && !canCreate) return null;
  const sendLabel = mode === "live" ? "Send to theprintspace" : "Get a quote";

  return (
    <section aria-labelledby="order-fulfilment" className="space-y-4">
      <h2 id="order-fulfilment" className="eyebrow">
        Fulfilment
      </h2>
      {!job ? (
        <div className="space-y-3 border-y py-5 text-sm">
          <p className="text-ink-muted">
            No print job. Orders paid while fulfilment was off, or flagged for
            review, aren&rsquo;t sent automatically.
          </p>
          <ActionForm action={createPrintJob} orderId={orderId}>
            Create a print job
          </ActionForm>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y py-5 text-sm">
            <Detail label="Status" value={JOB_STATUS_LABELS[job.status]} />
            <Detail
              label="Quoted cost"
              value={
                job.quoted_cost_pence === null
                  ? "No quote yet"
                  : formatPrice(job.quoted_cost_pence)
              }
            />
            {job.ch_order_number && (
              <Detail
                label="theprintspace order"
                value={`${job.ch_order_number}${job.ch_status ? ` · ${job.ch_status}` : ""}`}
              />
            )}
            {job.date_due && (
              <Detail label="Due" value={formatDateTime(job.date_due)} />
            )}
            {job.last_checked_at && (
              <Detail
                label="Last checked"
                value={formatDateTime(job.last_checked_at)}
              />
            )}
            {job.dispatched_at && (
              <Detail
                label="Dispatched"
                value={formatDateTime(job.dispatched_at)}
              />
            )}
          </dl>
          {job.hold_reason && (
            <p className="max-w-prose border-l-2 border-ink pl-4 text-sm">
              {job.hold_reason}
            </p>
          )}
          {job.last_error && job.last_error !== job.hold_reason && (
            <p className="max-w-prose text-xs text-ink-muted">
              Last error ({job.attempts}{" "}
              {job.attempts === 1 ? "attempt" : "attempts"}): {job.last_error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {["queued", "held", "failed", "quoted"].includes(job.status) &&
              mode !== "off" && (
                <ActionForm action={sendPrintJob} orderId={orderId}>
                  {sendLabel}
                </ActionForm>
              )}
            {job.status === "submitted" && (
              <ActionForm action={refreshPrintJob} orderId={orderId}>
                Refresh status
              </ActionForm>
            )}
            {!["dispatched", "cancelled", "sending"].includes(job.status) && (
              <ActionForm action={cancelPrintJob} orderId={orderId}>
                Mark cancelled
              </ActionForm>
            )}
          </div>
          {job.status === "submitted" && (
            <p className="max-w-prose text-xs text-ink-muted">
              theprintspace has no cancel option in their API. To stop this
              print, email support@theprintspace.co.uk with the order number,
              then mark it cancelled here.
            </p>
          )}
          {mode === "off" && (
            <p className="text-xs text-ink-muted">
              Fulfilment is switched off on this site.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function ActionForm({
  action,
  orderId,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  orderId: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Working…">
        {children}
      </SubmitButton>
    </form>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-ink-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
