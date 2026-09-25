import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { ProductPageLayout } from "@/components/product-page-layout";
import { ProductImage } from "@/components/product-image";
import { ProductViewTracker } from "@/components/product-view-tracker";
import { getCatalogProducts } from "@/lib/catalog";
import { resolveProductImage } from "@/lib/images";
import { getProductAltText, getProductSeoDescription } from "@/lib/seo";

// Note: R2 catalog loading is optional; will use fallback if unavailable
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const products = await getCatalogProducts();
  const product = products.find((item) => item.id === id);

  if (!product) {
    return {
      title: "Artwork Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const imageUrl = resolveProductImage(product.image);
  const pagePath = `/product/${product.id}`;

  return {
    title: `${product.title} Print`,
    description: getProductSeoDescription(product),
    keywords: [
      product.title,
      product.artist,
      `${product.category} photography print`,
      `${product.title} fine art print`,
      "Pixel or Paper art",
    ],
    alternates: {
      canonical: pagePath,
    },
    openGraph: {
      title: `${product.title} | Pixel or Paper`,
      description: getProductSeoDescription(product),
      type: "website",
      url: pagePath,
      images: [
        {
          url: imageUrl,
          alt: getProductAltText(product),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | Pixel or Paper`,
      description: getProductSeoDescription(product),
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; returnTo?: string }>;
}) {
  const { id } = await params;
  const { category, returnTo } = await searchParams;
  const products = await getCatalogProducts();
  const product = products.find((item) => item.id === id);

  if (!product) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const imageUrl = resolveProductImage(product.image);
  const absoluteImageUrl = imageUrl.startsWith("http")
    ? imageUrl
    : `${siteUrl}${imageUrl}`;
  const backHref = returnTo
    ? `/?category=${encodeURIComponent(category ?? "The Collection")}#gallery-item-${encodeURIComponent(returnTo)}`
    : `/?category=${encodeURIComponent(category ?? "The Collection")}`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: [absoluteImageUrl],
    description: product.description,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "Pixel or Paper",
    },
    category: product.category,
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: (product.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/product/${product.id}`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category,
        item: `${siteUrl}/?category=${encodeURIComponent(product.category)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: `${siteUrl}/product/${product.id}`,
      },
    ],
  };

  const jsonLd = [productJsonLd, breadcrumbJsonLd];
  const showArtist = product.artist.trim().toUpperCase() !== "UNFRAMED ARCHIVE";

  return (
    <ProductPageLayout>
      <main className="mx-auto w-full max-w-5xl px-6 md:px-10">
        <ProductViewTracker product={product} />
        {jsonLd.map((schema, idx) => (
          <script
            key={idx}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <Link
          href={backHref}
          className="mb-8 inline-block text-sm font-semibold text-zinc-700"
        >
          Back to gallery
        </Link>
        <article className="grid gap-8 rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm md:grid-cols-2">
          <div
            className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100"
            data-secure-image
          >
            <ProductImage
              src={product.image}
              alt={getProductAltText(product)}
              className="transition duration-500"
            />
          </div>
          <div>
            {showArtist ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-900/70">
                {product.artist}
              </p>
            ) : null}
            <h1 className="mb-2 text-4xl font-bold text-zinc-900">
              {product.title}
            </h1>
            <p className="mb-1 text-sm text-zinc-600">
              Category: {product.category}
            </p>
            <p className="mb-6 text-sm text-zinc-600">
              Print size: {product.size}
            </p>
            <p className="mb-6 leading-relaxed text-zinc-700">
              {product.description}
            </p>
            <ProductPurchasePanel product={product} />
          </div>
        </article>
      </main>
    </ProductPageLayout>
  );
}
