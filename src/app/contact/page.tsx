import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Pixel or Paper for order support, licensing questions, and general inquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact"
      intro="For support, order updates, licensing, or general questions, contact Pixel or Paper by email."
    >
      <InfoSection title="Email support">
        <p>
          Email:{" "}
          <a href="mailto:support@pixelorpaper.co.uk" className="link text-ink">
            support@pixelorpaper.co.uk
          </a>
        </p>
        <p>Typical response window: within 2 business days.</p>
      </InfoSection>

      <InfoSection title="Business identity">
        <p>
          Pixel or Paper is owned and operated by Malcolm Rose. All works listed
          for sale are original images by the same artist.
        </p>
        <address className="not-italic">
          {site.name}
          {site.address.map((line) => (
            <span key={line}>
              <br />
              {line}
            </span>
          ))}
        </address>
      </InfoSection>
    </InfoPage>
  );
}
