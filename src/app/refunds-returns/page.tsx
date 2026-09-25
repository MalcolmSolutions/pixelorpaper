import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Refunds and Returns",
  description:
    "Refund and return terms for print and digital purchases at Pixel or Paper.",
  alternates: {
    canonical: "/refunds-returns",
  },
};

export default function RefundsReturnsPage() {
  return (
    <LegalPageShell
      title="Refunds and Returns"
      intro="This page explains return eligibility and refund handling for print and digital orders from Pixel or Paper."
    >
      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Print orders</h2>
        <p>
          Print items are produced after purchase. If your print arrives damaged
          or defective, contact support@pixelorpaper.co.uk within 14 days of
          delivery with your order reference and clear photos of the issue.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Digital downloads
        </h2>
        <p>
          Due to the nature of digital goods, download purchases are generally
          non-refundable after access is provided, except where required by
          applicable consumer law.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Incorrect or missing items
        </h2>
        <p>
          If you receive the wrong product, or if an item is missing from your
          order, contact support as soon as possible and include your order
          details so a replacement or correction can be arranged.
        </p>
      </section>
    </LegalPageShell>
  );
}
