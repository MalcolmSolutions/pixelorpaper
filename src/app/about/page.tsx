import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "About the Artist",
  description:
    "Meet Malcolm Rose, the artist behind Pixel or Paper, and learn how each original image is created.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <LegalPageShell
      title="About the Artist"
      intro="Pixel or Paper is an independent photography practice by Malcolm Rose. Every image shown on this site is created and curated by one artist."
    >
      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Artist statement
        </h2>
        <p>
          I create images that focus on atmosphere, structure, and stillness. My
          work spans landscapes, cityscapes, architecture, and abstract details,
          and each piece is selected to suit modern interior spaces.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Ownership and rights
        </h2>
        <p>
          All images sold through Pixel or Paper are original works by Malcolm
          Rose. Copyright remains with the artist unless a separate written
          license agreement is provided.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900">
          Print and digital formats
        </h2>
        <p>
          Selected works are available as digital downloads or fine art prints.
          Print orders are produced after checkout and shipped to the delivery
          address supplied at purchase.
        </p>
      </section>
    </LegalPageShell>
  );
}
