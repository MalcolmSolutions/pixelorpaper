import { SectionHeading } from "@/components/section-heading";
import { PRINT_SIZES } from "@/lib/print-sizes";
import { formatPrice } from "@/lib/utils";

const LARGEST = Math.max(...PRINT_SIZES.map((s) => s.widthMm));

export function PriceList() {
  return (
    <section className="container-page pb-section">
      <SectionHeading
        eyebrow="Pricing"
        title="Print sizes"
        link={{ href: "/products", label: "Choose a print" }}
      />
      <ul className="grid grid-cols-2 gap-x-gutter gap-y-10 md:grid-cols-4">
        {PRINT_SIZES.map((size) => (
          <li key={size.name} className="flex flex-col">
            {/* Paper outline drawn to scale against the largest size. */}
            <div className="flex aspect-[4/5] items-end border-b pb-4">
              <div
                aria-hidden
                className="border bg-surface"
                style={{
                  width: `${(size.widthMm / LARGEST) * 70}%`,
                  aspectRatio: `${size.widthMm} / ${size.heightMm}`,
                }}
              />
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <h3 className="font-sans text-sm font-medium tracking-normal">
                {size.name}
              </h3>
              <p className="text-sm tabular-nums">{formatPrice(size.price)}</p>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
              {size.widthMm / 10} × {size.heightMm / 10} cm
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-ink-muted">
        Every print is available in all four sizes. Prices include UK VAT.
      </p>
    </section>
  );
}
