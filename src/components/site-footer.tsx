import Link from "next/link";
import { getCategories } from "@/lib/categories";
import { site } from "@/lib/site";

const PROMISES = [
  {
    title: "Clear UK VAT",
    body: "All prices are in pounds sterling and include UK VAT. What you see is what you pay at checkout.",
  },
  {
    title: "White-label fulfilment",
    body: "Prints are produced and shipped in plain, unbranded packaging, ideal for gifting, designers and resellers.",
  },
  {
    title: "Fast delivery",
    body: "Every print is made to order and dispatched quickly, with tracked delivery across the UK.",
  },
];

export async function SiteFooter() {
  const categories = await getCategories();

  return (
    <footer className="border-t bg-surface">
      <div className="container-page">
        <ul className="grid gap-8 border-b py-12 md:grid-cols-3 md:gap-grid-x">
          {PROMISES.map((p) => (
            <li key={p.title} className="space-y-2">
              <h3 className="text-base">{p.title}</h3>
              <p className="max-w-sm text-sm text-ink-muted">{p.body}</p>
            </li>
          ))}
        </ul>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-3">
            <p className="font-heading text-sm font-semibold tracking-label uppercase">
              {site.name}
            </p>
            <p className="max-w-xs text-sm text-ink-muted">
              Modern art for real homes.
            </p>
          </div>

          <FooterColumn title="Shop">
            <FooterLink href="/products">All prints</FooterLink>
            {categories.map((c) => (
              <FooterLink key={c.slug} href={`/products?category=${c.slug}`}>
                {c.name}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Create">
            <FooterLink href="/#wall-builder">Gallery wall builder</FooterLink>
            <FooterLink href="/cart">Your cart</FooterLink>
          </FooterColumn>

          <FooterColumn title="Information">
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
            <FooterLink href="/privacy-policy">Privacy</FooterLink>
            <FooterLink href="/terms-of-service">Terms</FooterLink>
            <FooterLink href="/refunds-returns">Returns</FooterLink>
          </FooterColumn>

          <FooterColumn title="Also find us on">
            <FooterLink href={site.links.etsy} external>
              Etsy
            </FooterLink>
            <FooterLink href={site.links.adobeStock} external>
              Adobe Stock
            </FooterLink>
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-2 border-t py-6 text-xs text-ink-muted md:flex-row md:justify-between">
          <p>
            Copyright {new Date().getFullYear()}. All images copyright Malcolm
            Rose.
          </p>
          <p>
            {site.name} by Malcolm Rose. Prices shown in GBP including VAT.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="eyebrow">{title}</p>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          {children}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <Link href={href} className="nav-link">
          {children}
        </Link>
      )}
    </li>
  );
}
