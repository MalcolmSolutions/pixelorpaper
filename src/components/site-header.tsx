import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur">
      <div className="container-page flex h-header items-center justify-between">
        <Link
          href="/"
          className="font-heading text-sm font-semibold tracking-label uppercase"
        >
          Pixel or Paper
        </Link>
        <nav className="flex items-center gap-6 md:gap-10">
          <Link href="/products" className="nav-link">
            Shop
          </Link>
          <Link href="/#wall-builder" className="nav-link hidden sm:inline">
            Build a wall
          </Link>
          <Link href="/cart" className="nav-link">
            Cart
          </Link>
        </nav>
      </div>
    </header>
  );
}
