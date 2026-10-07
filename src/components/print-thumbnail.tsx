import Image from "next/image";
import Link from "next/link";
import { wallColour } from "@/components/room-mockup";
import { getCategory } from "@/lib/categories";
import type { Product } from "@/types/product";

/**
 * Small framed print on its category's wall colour, linking to the product.
 * With no product (e.g. a print since removed from the shop) it shows an
 * empty wall.
 */
export async function PrintThumbnail({ product }: { product?: Product }) {
  const className =
    "media-well flex aspect-[4/5] w-20 shrink-0 items-center justify-center sm:w-24";
  if (!product) return <div aria-hidden className={className} />;

  const category = await getCategory(product.category);
  return (
    <Link
      href={`/products/${product.slug}`}
      tabIndex={-1}
      aria-hidden
      className={className}
      style={
        category
          ? ({ "--wall": wallColour(category.wall) } as React.CSSProperties)
          : undefined
      }
    >
      <Image
        src={product.image.src}
        alt=""
        width={product.image.width}
        height={product.image.height}
        sizes="96px"
        className="mb-[10%] h-auto max-h-[70%] w-auto max-w-[80%] bg-white p-[4%] shadow-[0_4px_10px_-4px_rgb(0_0_0/0.4)]"
      />
    </Link>
  );
}
