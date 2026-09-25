import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Pixel or Paper collects and uses personal data for analytics, support, and secure checkout.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      intro="This policy explains how Pixel or Paper collects, uses, and protects personal information when you browse, contact support, and place orders."
    >
      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Who controls your data
        </h2>
        <p>
          Pixel or Paper is operated by Malcolm Rose. For privacy questions,
          contact support@pixelorpaper.co.uk.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Data we collect
        </h2>
        <p>
          We may process usage information such as page views and interaction
          events, plus order information required to fulfill purchases including
          product selections, shipping details, and transaction references.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          How we use data
        </h2>
        <p>
          Data is used to operate the storefront, process orders, prevent abuse,
          improve site performance, and respond to support requests.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Payments and processors
        </h2>
        <p>
          Checkout is processed securely by Stripe. Pixel or Paper does not
          store full payment card numbers. Payment handling is subject to
          Stripe&apos;s security and privacy controls.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Analytics and cookies
        </h2>
        <p>
          This site uses analytics tools to understand traffic and performance.
          These tools may place cookies or similar identifiers to measure how
          the site is used. Non-essential analytics run only when you accept
          analytics cookies, and you can update your choice from Cookie settings
          in the site footer.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Your rights</h2>
        <p>
          If you are in the UK or EEA, you may request access, correction,
          deletion, restriction, or portability of personal data where
          applicable. You may also object to processing based on legitimate
          interests.
        </p>
      </section>
    </LegalPageShell>
  );
}
