"use client";

import Link from "next/link";
import { useCart } from "@/context/cart-context";

export interface PageHeaderProps {
  onCartClick?: () => void;
}

export function PageHeader({ onCartClick }: PageHeaderProps) {
  const { itemCount } = useCart();

  return (
    <header className="fixed inset-x-0 top-0 z-10 border-b border-orange-300/85 bg-orange-200/92 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 md:px-10 md:py-4">
        <div className="flex items-center">
          <Link
            href="/"
            className="-ml-1 text-4xl font-semibold italic tracking-normal text-blue-500 drop-shadow-sm font-serif transition hover:text-blue-600 sm:text-5xl md:-ml-2"
          >
            Pixel or Paper
          </Link>
        </div>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-800 md:flex"
        >
          <Link href="/about" className="transition hover:text-zinc-950">
            About
          </Link>
          <Link href="/contact" className="transition hover:text-zinc-950">
            Contact
          </Link>
          <Link
            href="/privacy-policy"
            className="transition hover:text-zinc-950"
          >
            Privacy
          </Link>
        </nav>

        <button
          onClick={onCartClick}
          className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-800 underline-offset-4 transition hover:text-zinc-950 hover:underline"
          type="button"
        >
          Cart ({itemCount})
        </button>
      </div>
    </header>
  );
}
