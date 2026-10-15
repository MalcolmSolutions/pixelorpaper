import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  JOB_STATUS_LABELS,
  MODE_LABELS,
} from "@/components/admin/fulfilment-panel";
import { formatDateTime } from "@/components/admin/order-labels";
import { requireAdmin } from "@/lib/admin";
import {
  checkConnection,
  getMode,
  listPrintJobs,
} from "@/lib/printspace/fulfilment";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Fulfilment" };

const COLUMNS = "md:grid-cols-[9rem_minmax(0,1fr)_10rem_7rem_9rem]";

/** Print jobs at theprintspace, newest first, and the connection's state. */
export default async function AdminFulfilmentPage() {
  await requireAdmin();
  const mode = getMode();
  const [connection, jobs] = await Promise.all([
    checkConnection(),
    listPrintJobs(),
  ]);
  const needsYou = jobs.filter((j) => ["held", "failed"].includes(j.status));

  return (
    <>
      <AdminPageHeader
        title="Fulfilment"
        description="Paid print orders sent to theprintspace for printing and posting. Downloads are never sent."
      />

      <dl className="mb-10 grid gap-x-6 gap-y-4 border-y py-5 text-sm sm:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-ink-muted">Mode</dt>
          <dd>{MODE_LABELS[mode]}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-ink-muted">theprintspace connection</dt>
          <dd>{connection.ok ? "Connected" : `Not working: ${connection.error}`}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-ink-muted">Needing you</dt>
          <dd>
            {needsYou.length === 0
              ? "Nothing"
              : `${needsYou.length} held or failed`}
          </dd>
        </div>
      </dl>

      {jobs.length === 0 ? (
        <p className="text-ink-muted">
          No print jobs yet. One is created when a print order is paid
          {mode === "off" ? ", once fulfilment is switched on" : ""}.
        </p>
      ) : (
        <div className="text-sm">
          <div
            className={`hidden gap-4 border-b pb-3 text-ink-muted md:grid ${COLUMNS}`}
          >
            <span>Order</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Cost</span>
            <span>Created</span>
          </div>
          <ul>
            {jobs.map((job) => (
              <li
                key={job.order_id}
                className={`grid gap-1 border-b py-4 md:gap-4 ${COLUMNS}`}
              >
                <Link
                  href={`/admin/orders/${job.reference}`}
                  className="link font-mono text-xs"
                >
                  {job.reference}
                </Link>
                <span className="truncate">{job.customer_name ?? "—"}</span>
                <span>
                  {JOB_STATUS_LABELS[job.status]}
                  {job.hold_reason && ["held", "failed"].includes(job.status) && (
                    <span className="block text-xs text-ink-muted">
                      {job.hold_reason}
                    </span>
                  )}
                </span>
                <span>
                  {job.quoted_cost_pence === null
                    ? "—"
                    : formatPrice(job.quoted_cost_pence)}
                </span>
                <span className="text-ink-muted">
                  {formatDateTime(job.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
