import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { SizePicker } from "@/components/products/size-picker";
import { wallColour } from "@/components/room-mockup";
import { SectionHeading } from "@/components/section-heading";
import { getCategory } from "@/lib/categories";
import { getProductBySlug, getProducts } from "@/lib/products";
import {
  collectionPath,
  jsonLdScript,
  metaDescription,
  OPEN_GRAPH,
  productJsonLd,
} from "@/lib/seo";

// Prints shown under "More from <collection>".
const RELATED_COUNT = 4;

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Print not found" };

  const path = `/products/${product.slug}`;
  const description = metaDescription(product.description);
  return {
    title: `${product.name} Photographic Print`,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OPEN_GRAPH,
      url: path,
      title: product.name,
      description,
      images: [
        {
          url: product.image.src,
          width: product.image.width,
          height: product.image.height,
          alt: product.image.alt,
        },
      ],
    },
  };
}

export default async function ProductPage(
  props: PageProps<"/products/[slug]">,
) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const [category, inCategory] = await Promise.all([
    getCategory(product.category),
    getProducts({ category: product.category }),
  ]);
  const related = inCategory
    .filter((p) => p.id !== product.id)
    .slice(0, RELATED_COUNT);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(productJsonLd(product, category)),
        }}
      />
      <div className="container-page section grid gap-10 md:grid-cols-12 lg:gap-16">
        <div
          className="media-well flex aspect-[4/5] items-center justify-center md:col-span-7 md:aspect-square"
          style={
            category
              ? ({ "--wall": wallColour(category.wall) } as React.CSSProperties)
              : undefined
          }
        >
          <Image
            src={product.image.src}
            alt={product.image.alt}
            width={product.image.width}
            height={product.image.height}
            sizes="(min-width: 90rem) 760px, (min-width: 48rem) 55vw, 100vw"
            preload
            className="mb-[13%] h-auto max-h-[78%] w-auto max-w-[86%] bg-white p-[2.5%] shadow-[0_10px_22px_-10px_rgb(0_0_0/0.4)]"
          />
        </div>
        <div className="space-y-6 md:col-span-5 md:pt-8">
          <nav aria-label="Breadcrumb" className="eyebrow flex gap-2">
            <Link href="/products" className="hover:text-ink">
              Prints
            </Link>
            {category && (
              <>
                <span aria-hidden>/</span>
                <Link
                  href={collectionPath(category.slug)}
                  className="hover:text-ink"
                >
                  {category.name}
                </Link>
              </>
            )}
          </nav>
          <h1>{product.name}</h1>
          <p className="max-w-prose text-ink-muted">{product.description}</p>
          {product.location && (
            <p className="text-sm">
              <span className="text-ink-muted">Location: </span>
              {product.location}
            </p>
          )}
          <hr />
          {product.available ? (
            <SizePicker
              productId={product.id}
              prices={product.prices}
              image={product.image}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-lg">Currently unavailable</p>
              <p className="text-sm text-ink-muted">
                This print isn&rsquo;t for sale at the moment.
              </p>
              <Link href="/products" className="btn btn-outline">
                Browse other prints
              </Link>
            </div>
          )}
        </div>
      </div>
      {category && related.length > 0 && (
        <section className="container-page pb-section">
          <SectionHeading
            title={`More from ${category.name}`}
            link={{
              href: collectionPath(category.slug),
              label: `View all ${category.name.toLowerCase()}`,
            }}
          />
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
