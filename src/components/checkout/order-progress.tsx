import { downloadState } from "@/lib/download-rules";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";

type StepState = "done" | "current" | "upcoming";
type Step = { title: string; detail: string; state: StepState };

/**
 * Where an order is, from payment to delivery (or, for an order of downloads
 * only, to download), derived from its saved state.
 */
function stepsFor(order: Order, hasPrints: boolean): Step[] {
  const paid = order.payment_status === "paid";
  const fulfilled = order.status === "fulfilled";

  const payment: Step =
    order.status === "pending"
      ? {
          title: "Payment",
          detail: "Waiting for Stripe to confirm",
          state: "current",
        }
      : order.payment_status === "processing"
        ? {
            title: "Payment",
            detail: "Processing, can take a few days",
            state: "current",
          }
        : { title: "Payment", detail: "Confirmed", state: "done" };

  if (!hasPrints) {
    const state = downloadState(order);
    const download: Step =
      state === "ready"
        ? { title: "Download", detail: "Ready to download", state: "done" }
        : state === "on_hold" || state === "outside_uk"
          ? {
              title: "Download",
              detail: "On hold while we check your order",
              state: "current",
            }
          : {
              title: "Download",
              detail: "Ready once payment is confirmed",
              state: "upcoming",
            };
    return [payment, download];
  }

  const printing: Step = fulfilled
    ? { title: "Printing", detail: "Printed", state: "done" }
    : order.status === "needs_review"
      ? {
          title: "Printing",
          detail: "On hold while we check your order",
          state: "current",
        }
      : paid
        ? { title: "Printing", detail: "Being made to order", state: "current" }
        : {
            title: "Printing",
            detail: "Made to order once payment is confirmed",
            state: "upcoming",
          };

  const delivery: Step = fulfilled
    ? {
        title: "Delivery",
        detail: "Sent with free UK tracked delivery",
        state: "done",
      }
    : {
        title: "Delivery",
        detail: "Free UK tracked delivery",
        state: "upcoming",
      };

  return [payment, printing, delivery];
}

export function OrderProgress({
  order,
  hasPrints = true,
}: {
  order: Order;
  /** False for an order of downloads only: no printing or delivery. */
  hasPrints?: boolean;
}) {
  const steps = stepsFor(order, hasPrints);
  return (
    <ol aria-label="Order progress" className="space-y-0">
      {steps.map((step, i) => (
        <li
          key={step.title}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex gap-4 pb-6 last:pb-0"
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                "absolute top-6 bottom-1 left-[11px] w-px",
                step.state === "done" ? "bg-ink" : "bg-line",
              )}
            />
          )}
          <Marker state={step.state} />
          <div className="space-y-0.5 pt-0.5">
            <p
              className={cn(
                "text-sm font-medium",
                step.state === "upcoming" && "text-ink-muted",
              )}
            >
              {step.title}
              <span className="sr-only">
                {step.state === "done"
                  ? " (complete)"
                  : step.state === "current"
                    ? " (in progress)"
                    : " (not started)"}
              </span>
            </p>
            <p className="text-sm text-ink-muted">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Marker({ state }: { state: StepState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-canvas",
        state === "done" && "border-ink bg-ink text-canvas",
        state === "current" && "border-ink",
        state === "upcoming" && "border-line",
      )}
    >
      {state === "done" ? (
        <svg viewBox="0 0 12 12" className="size-3" fill="none">
          <path
            d="M2.5 6.5 5 9l4.5-6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : state === "current" ? (
        <span className="size-2 rounded-full bg-ink motion-safe:animate-pulse" />
      ) : null}
    </span>
  );
}
