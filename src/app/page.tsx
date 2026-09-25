import type { Metadata } from "next";
import { getCatalogProducts } from "@/lib/catalog";
import { Storefront } from "@/components/storefront";

// Note: R2 catalog loading is optional; will use fallback if unavailable
export const runtime = "edge";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fine Art Photography Prints",
  description:
    "Browse original fine art photography prints by Malcolm Rose, featuring landscape, cityscape, architectural, and nature artwork for modern interiors.",
  keywords: [
    "fine art photography prints",
    "original landscape prints",
    "cityscape wall art",
    "nature photography print",
    "Malcolm Rose art",
    "modern wall decor",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Fine Art Photography Prints | Pixel or Paper",
    description:
      "Discover original landscape, cityscape, and nature photography prints by Malcolm Rose for contemporary interiors.",
    url: "/",
    locale: "en_GB",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const products = await getCatalogProducts();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Pixel or Paper",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pixel or Paper",
    legalName: "Pixel or Paper by Malcolm Rose",
    url: siteUrl,
    logo: `${siteUrl}/images/pixelorpaperLogo.png`,
    description:
      "Fine art photography prints and curated imagery by a single artist, Malcolm Rose.",
    founder: {
      "@type": "Person",
      name: "Malcolm Rose",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@pixelorpaper.co.uk",
      url: `${siteUrl}/contact`,
    },
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Fine Art Photography Prints",
    description:
      "Curated fine art photography prints by Malcolm Rose, including landscape, cityscape, architectural, and nature imagery.",
    url: siteUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "Pixel or Paper",
      url: siteUrl,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        question: "What kind of art is sold at Pixel or Paper?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pixel or Paper sells original contemporary fine art photography prints by Malcolm Rose, including landscape, cityscape, architectural, and nature photography.",
        },
      },
      {
        "@type": "Question",
        question: "Do you offer wall art for modern interiors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Each print is selected for contemporary interiors, with a mix of calm, textural, and architectural work suited to homes, studios, and creative spaces.",
        },
      },
      {
        "@type": "Question",
        question: "Is it possible to buy a print in different sizes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The catalog includes a range of print sizes and formats, with details available on each product page before checkout.",
        },
      },
    ],
  };

  const jsonLdScripts = [
    websiteJsonLd,
    organizationJsonLd,
    collectionJsonLd,
    faqJsonLd,
  ];

  return (
    <>
      {jsonLdScripts.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Storefront products={products} initialCategory={category} />
    </>
  );
}
