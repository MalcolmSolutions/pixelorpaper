import Link from "next/link";
import { FramedPrint } from "@/components/framed-print";
import { wallColour } from "@/components/room-mockup";
import { getCategory } from "@/lib/categories";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

// Frame width as % of the card, by orientation. Tall prints are narrowed
// further so they always clear the floor line.
const FRAME_WIDTH = { landscape: 80, square: 64, portrait: 56 };

/** Rendered photo width per breakpoint, matching .product-grid columns. */
const SIZES = "(min-width: 90rem) 280px, (min-width: 64rem) 19vw, (min-width: 48rem) 25vw, 40vw";

export async function ProductCard({
  product,
  eager = false,
}: {
  product: Product;
  /** Load the image immediately (for cards above the fold). */
  eager?: boolean;
}) {
  const category = await getCategory(product.category);
  const ratio = product.image.width / product.image.height;
  const width = Math.min(FRAME_WIDTH[product.orientation], 90 * ratio);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div
        className="media-well aspect-[4/5]"
        style={
          category
            ? ({ "--wall": wallColour(category.wall) } as React.CSSProperties)
            : undefined
        }
      >
        <div className="absolute inset-x-0 top-0 bottom-[13%] flex items-center justify-center">
          <FramedPrint
            print={{ ...product.image, alt: "" }}
            natural
            sizes={SIZES}
            loading={eager ? "eager" : undefined}
            className="transition-transform duration-500 ease-out-soft group-hover:-translate-y-1 group-hover:scale-[1.03]"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h3 className="font-sans text-sm font-medium tracking-normal underline-offset-4 group-hover:underline">
          {product.name}
        </h3>
        <p className="shrink-0 text-sm tabular-nums">
          {formatPrice(product.price, product.currency)}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        {product.location ?? category?.name}
      </p>
    </Link>
  );
}
