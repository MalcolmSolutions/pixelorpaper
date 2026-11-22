import { SectionHeading } from "@/components/section-heading";
import {
  DELIVERY_PRICE,
  DIGITAL_DOWNLOAD,
  FUJI_SIZES,
  PRINT_SIZES,
  vatIn,
} from "@/lib/print-sizes";
import { formatPrice } from "@/lib/utils";

const LARGEST = Math.max(...PRINT_SIZES.map((s) => s.widthMm));

export function PriceList() {
  return (
    <section className="container-page pb-section">
      <SectionHeading
        eyebrow="Pricing"
        title="Prices"
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
              <p className="text-sm tabular-nums">
                {formatPrice(size.price)}
              </p>
            </div>
            <p className="mt-0.5 flex justify-between gap-3 text-xs text-ink-muted tabular-nums">
              <span>
                {size.widthMm / 10} × {size.heightMm / 10} cm
              </span>
              <span>incl. {formatPrice(vatIn(size.price))} VAT</span>
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-col gap-1 border-y py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div>
          <h3 className="font-sans text-sm font-medium tracking-normal">
            {DIGITAL_DOWNLOAD.label}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            The full-resolution image file of any print, to download as soon as
            payment clears. UK customers only.
          </p>
        </div>
        <p className="text-sm tabular-nums">
          {formatPrice(DIGITAL_DOWNLOAD.price)}{" "}
          <span className="text-xs text-ink-muted">
            incl. {formatPrice(vatIn(DIGITAL_DOWNLOAD.price))} VAT
          </span>
        </p>
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        Every print is available in these four sizes, {FUJI_SIZES.length} more inch sizes or as
        a download. All prices include UK VAT at 20%. UK tracked delivery is{" "}
        {formatPrice(DELIVERY_PRICE)} per order of prints, whatever the size or
        number; downloads have no delivery charge.
      </p>
    </section>
  );
}
