import Image from "next/image";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/cookie-settings-button";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-14 border-t border-orange-300/85 bg-orange-200/92 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-6 py-4 md:flex-row md:items-center md:px-10">
        <div className="relative h-10 w-52 overflow-hidden rounded-md md:h-12 md:w-64">
          <Image
            src="/images/pixelorpaperLogo.png"
            alt="Pixel or Paper logo"
            fill
            className="object-cover object-center"
          />
        </div>

        <nav
          aria-label="Legal and trust pages"
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.12em] text-zinc-700"
        >
          <Link href="/about" className="transition hover:text-zinc-900">
            About
          </Link>
          <Link
            href="/privacy-policy"
            className="transition hover:text-zinc-900"
          >
            Privacy
          </Link>
          <Link
            href="/terms-of-service"
            className="transition hover:text-zinc-900"
          >
            Terms
          </Link>
          <Link
            href="/refunds-returns"
            className="transition hover:text-zinc-900"
          >
            Returns
          </Link>
          <Link href="/contact" className="transition hover:text-zinc-900">
            Contact
          </Link>
        </nav>
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-1 border-t border-orange-300/80 px-6 py-3 md:flex-row md:items-center md:px-10">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-700">
          Copyright {currentYear}. All images copyright Malcolm Rose.
        </p>
        <div className="flex items-center gap-4">
          <p className="text-xs text-zinc-700">
            Pixel or Paper by Malcolm Rose.
          </p>
          <CookieSettingsButton />
        </div>
      </div>
    </footer>
  );
}
