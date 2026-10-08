import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Pixel or Paper uses personal information for orders, customer accounts and support, and the cookies the site uses.",
};

// Keep in step with the code: cookies are set in src/lib/cart.ts and
// src/lib/auth.ts; sign-in links and sessions are configured in auth.ts.
const COOKIES = [
  {
    name: "cart",
    purpose:
      "Remembers the prints and sizes in your cart. It holds no personal details.",
    duration: "30 days",
  },
  {
    name: "pp_session",
    purpose:
      "Keeps you signed in to your account. Signing out removes it straight away.",
    duration: "30 days",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro="This policy explains how Pixel or Paper collects, uses, and protects personal information when you browse, create an account, contact support, and place orders."
    >
      <InfoSection title="Who controls your data">
        <p>
          Pixel or Paper is operated by Malcolm Rose. For privacy questions,
          contact support@pixelorpaper.co.uk.
        </p>
        <p>Last updated 8 October 2026.</p>
      </InfoSection>

      <InfoSection title="Data we collect">
        <p>
          When you order, we keep the order details needed to fulfil it: the
          prints, sizes and prices, your name, email address and delivery
          address, and the Stripe payment references for the order.
        </p>
        <p>
          If you create an account, we keep your email address and a record of
          when it was created. We don&apos;t ask for a password.
        </p>
        <p>
          We don&apos;t use analytics or advertising tools, and we don&apos;t
          track you across other websites.
        </p>
      </InfoSection>

      <InfoSection title="Customer accounts">
        <p>
          Accounts let you see your orders. To sign in, you enter your email
          address and we send you a sign-in link. Each link works once and
          expires after 15 minutes. We store only a scrambled (hashed) copy of
          each link and session, never the link itself.
        </p>
        <p>
          When you sign in, orders previously placed with the same email address
          are added to your account, because opening the link proves the address
          is yours. Orders you place while signed in are linked to your account
          automatically.
        </p>
        <p>
          Signing in keeps you signed in on that device for up to 30 days. You
          can sign out at any time from your account page.
        </p>
      </InfoSection>

      <InfoSection title="How we use data">
        <p>
          Data is used to operate the storefront, process and deliver orders,
          let you sign in and view your orders, prevent abuse, and respond to
          support requests. We don&apos;t sell your data or use it for
          marketing.
        </p>
      </InfoSection>

      <InfoSection title="Payments and processors">
        <p>
          Checkout is processed securely by Stripe. Pixel or Paper does not
          store full payment card numbers. Payment handling is subject to
          Stripe&apos;s security and privacy controls.
        </p>
        <p>
          We also rely on these services to run the shop: Cloudflare hosts the
          website, its database and the print images, and Resend delivers
          sign-in emails. They process data only to provide those services.
        </p>
      </InfoSection>

      <InfoSection title="Cookies">
        <p>
          This site uses only the two cookies below, both essential for it to
          work, so there&apos;s no cookie banner. We don&apos;t use analytics,
          advertising or tracking cookies.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-ink">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Cookie
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  What it&apos;s for
                </th>
                <th scope="col" className="py-2 font-medium">
                  Lasts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {COOKIES.map((cookie) => (
                <tr key={cookie.name} className="align-top">
                  <td className="py-3 pr-4 font-mono text-xs text-ink">
                    {cookie.name}
                  </td>
                  <td className="py-3 pr-4">{cookie.purpose}</td>
                  <td className="py-3 whitespace-nowrap">{cookie.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          When you pay, you&apos;re taken to Stripe&apos;s checkout page, where
          Stripe may set its own cookies for security and fraud prevention under
          its own privacy policy.
        </p>
      </InfoSection>

      <InfoSection title="Your rights">
        <p>
          If you are in the UK or EEA, you may request access, correction,
          deletion, restriction, or portability of personal data where
          applicable. You may also object to processing based on legitimate
          interests. To close your account or ask about your data, contact
          support@pixelorpaper.co.uk.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
