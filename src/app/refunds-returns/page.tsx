import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Refunds and Returns",
  description:
    "Refund and return terms for print and digital purchases at Pixel or Paper.",
};

export default function RefundsReturnsPage() {
  return (
    <InfoPage
      title="Refunds and Returns"
      intro="This page explains return eligibility and refund handling for print and digital orders from Pixel or Paper."
    >
      <InfoSection title="Print orders">
        <p>
          Print items are produced after purchase. If your print arrives damaged
          or defective, contact support@pixelorpaper.co.uk within 14 days of
          delivery with your order reference and clear photos of the issue.
        </p>
      </InfoSection>

      <InfoSection title="Digital downloads">
        <p>
          Due to the nature of digital goods, download purchases are generally
          non-refundable after access is provided, except where required by
          applicable consumer law.
        </p>
      </InfoSection>

      <InfoSection title="Incorrect or missing items">
        <p>
          If you receive the wrong product, or if an item is missing from your
          order, contact support as soon as possible and include your order
          details so a replacement or correction can be arranged.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
