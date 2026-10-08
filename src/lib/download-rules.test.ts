import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  downloadFilename,
  downloadState,
  guestLinkActive,
  isDownloadItem,
} from "@/lib/download-rules";
import type { Order } from "@/types/order";

type State = Pick<
  Order,
  "status" | "payment_status" | "billing_country" | "refunded_at"
>;
const paidUk: State = {
  status: "placed",
  payment_status: "paid",
  billing_country: "GB",
  refunded_at: null,
};

describe("downloadState", () => {
  it("is ready for a paid, placed order billed to the UK", () => {
    assert.equal(downloadState(paidUk), "ready");
    assert.equal(downloadState({ ...paidUk, status: "fulfilled" }), "ready");
  });

  it("waits while checkout is open or a payment is clearing", () => {
    assert.equal(
      downloadState({
        ...paidUk,
        status: "pending",
        payment_status: "unpaid",
        billing_country: null,
      }),
      "awaiting_payment",
    );
    assert.equal(
      downloadState({ ...paidUk, payment_status: "processing" }),
      "awaiting_payment",
    );
  });

  it("refuses billing addresses outside the UK, even once paid", () => {
    assert.equal(
      downloadState({ ...paidUk, status: "needs_review", billing_country: "FR" }),
      "outside_uk",
    );
    assert.equal(
      downloadState({ ...paidUk, billing_country: "US" }),
      "outside_uk",
    );
  });

  it("holds orders under review, or with no billing country", () => {
    assert.equal(
      downloadState({ ...paidUk, status: "needs_review" }),
      "on_hold",
    );
    assert.equal(
      downloadState({ ...paidUk, billing_country: null }),
      "on_hold",
    );
  });

  it("withdraws refunded orders, including fulfilled ones still marked paid", () => {
    assert.equal(
      downloadState({ ...paidUk, payment_status: "refunded" }),
      "refunded",
    );
    assert.equal(
      downloadState({
        ...paidUk,
        status: "fulfilled",
        refunded_at: "2026-10-08T12:00:00Z",
      }),
      "refunded",
    );
  });

  it("is unavailable when payment failed or checkout was abandoned", () => {
    assert.equal(
      downloadState({ ...paidUk, payment_status: "failed" }),
      "unavailable",
    );
    for (const status of ["expired", "cancelled"] as const) {
      assert.equal(
        downloadState({ ...paidUk, status, payment_status: "unpaid" }),
        "unavailable",
      );
    }
  });
});

describe("guestLinkActive", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  it("works for 7 days after payment", () => {
    assert.equal(guestLinkActive({ paid_at: "2026-10-08T11:00:00Z" }, now), true);
    assert.equal(guestLinkActive({ paid_at: "2026-10-01T12:00:01Z" }, now), true);
    assert.equal(guestLinkActive({ paid_at: "2026-10-01T12:00:00Z" }, now), false);
  });
  it("never works for an unpaid order", () => {
    assert.equal(guestLinkActive({ paid_at: null }, now), false);
  });
});

describe("isDownloadItem", () => {
  it("matches only the DIGITAL format", () => {
    assert.equal(isDownloadItem({ size: "DIGITAL" }), true);
    assert.equal(isDownloadItem({ size: "A4" }), false);
  });
});

describe("downloadFilename", () => {
  it("names the file after the print, keeping the original's extension", () => {
    assert.equal(
      downloadFilename("Venice Skyline with Campanile", "cityscapes/x.JPG"),
      "venice-skyline-with-campanile.jpg",
    );
    assert.equal(downloadFilename("Café — Nuit", "a/b.png"), "cafe-nuit.png");
    assert.equal(downloadFilename("Rome", "a/b.jpeg"), "rome.jpg");
  });
  it("falls back to a safe name and extension", () => {
    assert.equal(downloadFilename("***", "noext"), "pixel-or-paper.jpg");
  });
});
