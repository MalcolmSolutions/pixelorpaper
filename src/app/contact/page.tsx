import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Pixel or Paper for order support, licensing questions, and general inquiries.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <LegalPageShell
      title="Contact"
      intro="For support, order updates, licensing, or general questions, contact Pixel or Paper by email."
    >
      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">Email support</h2>
        <p>
          Email:{" "}
          <a
            className="font-semibold text-zinc-900 underline"
            href="mailto:support@pixelorpaper.co.uk"
          >
            support@pixelorpaper.co.uk
          </a>
        </p>
        <p>Typical response window: within 2 business days.</p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Business identity
        </h2>
        <p>
          Pixel or Paper is owned and operated by Malcolm Rose. All works listed
          for sale are original images by the same artist.
        </p>
      </section>
    </LegalPageShell>
  );
}
