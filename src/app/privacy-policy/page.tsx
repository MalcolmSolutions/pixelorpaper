import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Pixel or Paper collects and uses personal data for analytics, support, and secure checkout.",
};

export default function PrivacyPolicyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro="This policy explains how Pixel or Paper collects, uses, and protects personal information when you browse, contact support, and place orders."
    >
      <InfoSection title="Who controls your data">
        <p>
          Pixel or Paper is operated by Malcolm Rose. For privacy questions,
          contact support@pixelorpaper.co.uk.
        </p>
      </InfoSection>

      <InfoSection title="Data we collect">
        <p>
          We may process usage information such as page views and interaction
          events, plus order information required to fulfill purchases including
          product selections, shipping details, and transaction references.
        </p>
      </InfoSection>

      <InfoSection title="How we use data">
        <p>
          Data is used to operate the storefront, process orders, prevent abuse,
          improve site performance, and respond to support requests.
        </p>
      </InfoSection>

      <InfoSection title="Payments and processors">
        <p>
          Checkout is processed securely by Stripe. Pixel or Paper does not
          store full payment card numbers. Payment handling is subject to
          Stripe&apos;s security and privacy controls.
        </p>
      </InfoSection>

      <InfoSection title="Analytics and cookies">
        <p>
          This site uses analytics tools to understand traffic and performance.
          These tools may place cookies or similar identifiers to measure how
          the site is used. Non-essential analytics run only when you accept
          analytics cookies, and you can update your choice from Cookie settings
          in the site footer.
        </p>
      </InfoSection>

      <InfoSection title="Your rights">
        <p>
          If you are in the UK or EEA, you may request access, correction,
          deletion, restriction, or portability of personal data where
          applicable. You may also object to processing based on legitimate
          interests.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
