import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing purchases, use, and intellectual property for Pixel or Paper.",
  alternates: {
    canonical: "/terms-of-service",
  },
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      intro="By using Pixel or Paper and placing an order, you agree to these terms. If you do not agree, please do not use this website."
    >
      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Products and orders
        </h2>
        <p>
          Product images, sizes, and finishes are presented as accurately as
          possible. Availability, pricing, and product details may be updated at
          any time to keep the catalog accurate.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Payments</h2>
        <p>
          Payments are processed by Stripe using encrypted checkout flows.
          Orders are confirmed after successful payment authorization.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Intellectual property
        </h2>
        <p>
          All images, branding, and content on this site are owned by Malcolm
          Rose unless stated otherwise. Purchasing a print or digital file does
          not transfer copyright ownership.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Permitted use</h2>
        <p>
          You may not copy, redistribute, resell, scrape, or republish content
          from this site without written permission.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Liability</h2>
        <p>
          Pixel or Paper is provided on an &quot;as available&quot; basis. To
          the fullest extent permitted by law, liability is limited to the
          amount paid for the relevant order.
        </p>
      </section>
    </LegalPageShell>
  );
}
