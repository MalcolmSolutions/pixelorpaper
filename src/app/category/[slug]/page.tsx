import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { getCatalogProducts } from "@/lib/catalog";
import { getCategorySeo } from "@/lib/seo";
import { productCategories } from "@/types/product";

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function getCategoryFromSlug(slug: string) {
  return productCategories.find(
    (category) => normalizeSlug(category) === normalizeSlug(slug),
  );
}

export async function generateStaticParams() {
  return productCategories.map((category) => ({
    slug: normalizeSlug(category),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryFromSlug(slug);

  if (!category) {
    return {
      title: "Category Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const seo = getCategorySeo(category);
  const canonical = `/category/${normalizeSlug(category)}`;

  return {
    title: seo.title,
    description: seo.description,
    keywords: [
      `${category.toLowerCase()} photography prints`,
      `${category.toLowerCase()} wall art`,
      `Malcolm Rose ${category.toLowerCase()}`,
      "Pixel or Paper",
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: "website",
      locale: "en_GB",
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryFromSlug(slug);

  if (!category) {
    notFound();
  }

  const products = await getCatalogProducts();
  const categoryProducts = products.filter(
    (product) => product.category === category,
  );
  const seo = getCategorySeo(category);
  const canonical = `/category/${normalizeSlug(category)}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const categoryJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seo.title,
    description: seo.description,
    url: `${siteUrl}${canonical}`,
    isPartOf: {
      "@type": "WebSite",
      name: "Pixel or Paper",
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryJsonLd) }}
      />
      <Storefront products={categoryProducts} initialCategory={category} />
    </>
  );
}
