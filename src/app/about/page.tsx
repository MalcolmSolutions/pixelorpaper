import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = {
  title: "About the Artist",
  description:
    "Meet Malcolm Rose, the artist behind Pixel or Paper, and learn how each original image is created.",
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About the Artist"
      intro="Pixel or Paper is an independent photography practice by Malcolm Rose. Every image shown on this site is created and curated by one artist."
    >
      <InfoSection title="Artist statement">
        <p>
          I create images that focus on atmosphere, structure, and stillness. My
          work spans landscapes, cityscapes, architecture, and abstract details,
          and each piece is selected to suit modern interior spaces.
        </p>
      </InfoSection>

      <InfoSection title="Ownership and rights">
        <p>
          All images sold through Pixel or Paper are original works by Malcolm
          Rose. Copyright remains with the artist unless a separate written
          license agreement is provided.
        </p>
      </InfoSection>

      <InfoSection title="Print and digital formats">
        <p>
          Selected works are available as digital downloads or fine art prints.
          Print orders are produced after checkout and shipped to the delivery
          address supplied at purchase.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
