import Link from "next/link";
import { RoomMockup } from "@/components/room-mockup";
import { SectionHeading } from "@/components/section-heading";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

export function FeaturedCollections({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  // The three largest categories, each shown with its first few prints.
  const featured = categories.toSorted((a, b) => b.count - a.count).slice(0, 3);

  return (
    <section className="container-page pb-section">
      <SectionHeading title="Shop by category" />
      <ul className="snap-row gap-grid-x md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {featured.map((category, i) => {
          const prints = products
            .filter((p) => p.category === category.slug)
            .slice(0, 3)
            .map((p) => p.image);

          return (
            <li key={category.slug} className="w-[82%] sm:w-[60%] md:w-auto">
              <Link
                href={`/products?category=${category.slug}`}
                className="group block"
              >
                <div className="overflow-hidden">
                  <RoomMockup
                    prints={prints}
                    layout="trio"
                    wall={category.wall}
                    furniture={i === 1 ? "sofa" : "sideboard"}
                    frame={i === 1 ? "oak" : "black"}
                    galleryWidth={78}
                    className="aspect-[4/5] transition-transform duration-700 ease-out-soft group-hover:scale-[1.03] md:aspect-square"
                  />
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="eyebrow tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="underline-offset-4 group-hover:underline">
                    {category.name}
                  </h3>
                </div>
                <p className="mt-1.5 text-sm text-ink-muted">
                  {category.description}
                </p>
                <p className="mt-3 text-xs text-ink-muted">
                  {category.count} prints
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
