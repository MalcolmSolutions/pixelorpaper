import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing purchases, use, and intellectual property for Pixel or Paper.",
};

export default function TermsOfServicePage() {
  return (
    <InfoPage
      title="Terms of Service"
      intro="By using Pixel or Paper and placing an order, you agree to these terms. If you do not agree, please do not use this website."
    >
      <InfoSection title="Products and orders">
        <p>
          Product images, sizes, and finishes are presented as accurately as
          possible. Availability, pricing, and product details may be updated at
          any time to keep the catalog accurate.
        </p>
      </InfoSection>

      <InfoSection title="Payments">
        <p>
          Payments are processed by Stripe using encrypted checkout flows.
          Orders are confirmed after successful payment authorization.
        </p>
      </InfoSection>

      <InfoSection title="Intellectual property">
        <p>
          All images, branding, and content on this site are owned by Malcolm
          Rose unless stated otherwise. Purchasing a print or digital file does
          not transfer copyright ownership.
        </p>
      </InfoSection>

      <InfoSection title="Permitted use">
        <p>
          You may not copy, redistribute, resell, scrape, or republish content
          from this site without written permission.
        </p>
      </InfoSection>

      <InfoSection title="Liability">
        <p>
          Pixel or Paper is provided on an &quot;as available&quot; basis. To
          the fullest extent permitted by law, liability is limited to the
          amount paid for the relevant order.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
