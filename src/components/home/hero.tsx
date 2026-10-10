import Link from "next/link";
import { RoomMockup, SIDEBOARD_ROOM } from "@/components/room-mockup";
import { collectionPath } from "@/lib/seo";
import type { Print } from "@/components/framed-print";
import type { Category } from "@/types/category";

export function Hero({
  categories,
  prints,
}: {
  categories: Category[];
  prints: Print[];
}) {
  return (
    <section className="overflow-x-clip">
      <div className="container-page grid items-center gap-10 pt-6 pb-section md:pt-10 lg:grid-cols-12 lg:gap-0">
        <div className="space-y-7 lg:col-span-5 lg:pr-12">
          <h1 className="text-display">Modern art for real homes.</h1>
          <p className="max-w-[38ch] text-lg leading-relaxed text-ink-muted">
            Prints made to live together: quiet tones, natural textures and
            modern shapes that sit easily in everyday rooms.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="btn btn-primary">
              Shop Prints
            </Link>
            <Link href="#wall-builder" className="btn btn-outline">
              Build your own wall
            </Link>
          </div>

          <nav
            aria-label="Categories"
            className="border-t pt-5 text-sm lg:max-w-sm"
          >
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={collectionPath(c.slug)}
                    className="nav-link text-ink-muted hover:text-ink"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* On desktop the room bleeds to the right edge of the viewport. */}
        <RoomMockup
          prints={prints}
          layout="feature"
          photo={SIDEBOARD_ROOM}
          preload
          className="-mx-gutter aspect-[5/4] lg:col-span-7 lg:aspect-auto lg:h-[min(calc(100svh_-_var(--header-h)_-_4rem),46vw)] lg:min-h-[30rem] lg:mr-[calc(-1*(max(0px,(100vw_-_90rem)/2)_+_var(--gutter)))] lg:ml-0"
        />
      </div>
    </section>
  );
}
