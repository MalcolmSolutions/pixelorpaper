import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { wallColour } from "@/components/room-mockup";
import { getCategory } from "@/lib/categories";
import { getProductBySlug } from "@/lib/products";

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  return {
    title: product?.name ?? "Product not found",
    description: product?.description,
  };
}

export default async function ProductPage(
  props: PageProps<"/products/[slug]">,
) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const category = await getCategory(product.category);

  return (
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
        {category && (
          <Link
            href={`/products?category=${category.slug}`}
            className="eyebrow hover:text-ink"
          >
            {category.name}
          </Link>
        )}
        <h1>{product.name}</h1>
        <p className="max-w-prose text-ink-muted">{product.description}</p>
        {product.location && (
          <p className="text-sm">
            <span className="text-ink-muted">Location: </span>
            {product.location}
          </p>
        )}
        <hr />
        <button type="button" className="btn btn-primary btn-block" disabled>
          Add to cart
        </button>
      </div>
    </div>
  );
}
