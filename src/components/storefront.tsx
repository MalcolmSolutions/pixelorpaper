"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/format";
import { getProductAltText } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { ProductImage } from "@/components/product-image";
import { SiteFooter } from "@/components/site-footer";
import type { Product } from "@/types/product";

const PRODUCTS_PER_PAGE = 9;

const categories = [
  "Categories",
  "All Categories",
  "Landscapes",
  "Cityscapes",
  "Buildings",
  "Nature",
  "Misc",
] as const;
type Category = (typeof categories)[number];

function toCategory(value: string | undefined): Category {
  if (!value) {
    return "Categories";
  }

  return (categories as readonly string[]).includes(value)
    ? (value as Category)
    : "Categories";
}

export function Storefront({
  products,
  initialCategory,
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>(
    toCategory(initialCategory),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);
  const [isRecoveringCatalog, setIsRecoveringCatalog] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const productGridRef = useRef<HTMLElement | null>(null);
  const { cart, subtotalCents, removeFromCart, clearCart } = useCart();

  const goToPage = (page: number) => {
    setCurrentPage(page);
    requestAnimationFrame(() => {
      const gridTop = productGridRef.current?.getBoundingClientRect().top;
      const headerHeight =
        document.querySelector("header")?.getBoundingClientRect().height ?? 0;

      if (gridTop === undefined) {
        return;
      }

      window.scrollTo({
        top: window.scrollY + gridTop - headerHeight - 16,
        behavior: "smooth",
      });
    });
  };

  const visibleProducts = useMemo(() => {
    if (
      activeCategory === "Categories" ||
      activeCategory === "All Categories"
    ) {
      return catalogProducts;
    }

    return catalogProducts.filter(
      (product) => product.category === activeCategory,
    );
  }, [activeCategory, catalogProducts]);

  const categoryCards = useMemo(() => {
    return categories
      .filter((category) => category !== "Categories")
      .map((category) => {
        const firstProduct =
          category === "All Categories"
            ? catalogProducts[0]
            : catalogProducts.find((product) => product.category === category);

        return {
          category,
          image: firstProduct?.image ?? "/images/IMG_5634.JPG",
          count:
            category === "All Categories"
              ? catalogProducts.length
              : catalogProducts.filter(
                  (product) => product.category === category,
                ).length,
        };
      });
  }, [catalogProducts]);

  const paginatedProducts = useMemo(() => {
    if (activeCategory === "Categories") {
      return [];
    }

    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return visibleProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [activeCategory, currentPage, visibleProducts]);

  const totalPages = useMemo(() => {
    if (activeCategory === "Categories") {
      return 0;
    }

    return Math.max(1, Math.ceil(visibleProducts.length / PRODUCTS_PER_PAGE));
  }, [activeCategory, visibleProducts.length]);

  useEffect(() => {
    setCatalogProducts(products);
  }, [products]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  useEffect(() => {
    if (catalogProducts.length > 0) {
      return;
    }

    let cancelled = false;

    const recoverCatalog = async () => {
      setIsRecoveringCatalog(true);
      try {
        const response = await fetch("/api/catalog", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { products?: Product[] };
        if (!cancelled && Array.isArray(payload.products)) {
          setCatalogProducts(payload.products);
        }
      } catch {
        // Keep existing empty state message if runtime recovery fails.
      } finally {
        if (!cancelled) {
          setIsRecoveringCatalog(false);
        }
      }
    };

    void recoverCatalog();

    return () => {
      cancelled = true;
    };
  }, [catalogProducts.length]);

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCartOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCartOpen]);

  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "IMG" ||
        target.closest("[data-secure-image]") ||
        target.closest("article")
      ) {
        event.preventDefault();
      }
    };

    const preventDrag = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "IMG" || target.closest("[data-secure-image]")) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventContextMenu, false);
    document.addEventListener("dragstart", preventDrag, false);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu, false);
      document.removeEventListener("dragstart", preventDrag, false);
    };
  }, []);

  const checkout = async () => {
    if (cart.length === 0) {
      return;
    }

    setIsCheckingOut(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            purchaseType: item.variant.kind,
            printSizeKey:
              item.variant.kind === "print"
                ? item.variant.printSizeKey
                : undefined,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Checkout failed");
      }

      const payload = (await response.json()) as { url?: string };
      if (payload.url) {
        window.location.href = payload.url;
      }
    } catch {
      alert(
        "Checkout could not be started. Confirm your Stripe keys in .env.local.",
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-orange-50/90">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,167,122,0.42)_0%,rgba(255,167,122,0)_70%)]" />

      <PageHeader onCartClick={() => setIsCartOpen((value) => !value)} />

      <section className="relative mt-14 h-[36vh] min-h-56 w-full overflow-hidden border-b border-orange-300/85 sm:h-[42vh] sm:min-h-64 md:h-[48vh] md:min-h-72 lg:h-[52vh] lg:min-h-80">
        <Image
          src="/images/IMG_5634.JPG"
          alt="Scenic gallery hero background"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-6 md:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.08em] text-blue-200 drop-shadow-sm sm:text-base">
              Original fine art photography for modern interiors
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white drop-shadow-md md:text-6xl">
              Fine art photography prints by Malcolm Rose
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-orange-50/95 sm:text-base">
              Discover landscape, cityscape, architectural, and nature artwork
              designed to bring calm, texture, and story to your walls.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mb-8 flex w-full max-w-6xl flex-wrap gap-3 px-6 pt-10 md:px-10">
        {categories
          .filter((category) => category !== "All Categories")
          .map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === category
                  ? "bg-zinc-900 text-orange-50"
                  : "bg-white/70 text-zinc-700 hover:bg-white"
              }`}
              type="button"
            >
              {category}
            </button>
          ))}
      </section>

      <main
        ref={productGridRef}
        className="mx-auto grid w-full max-w-6xl gap-6 px-6 md:grid-cols-2 md:px-10 lg:grid-cols-3"
      >
        {catalogProducts.length === 0 ? (
          <section className="col-span-full rounded-3xl border border-orange-300 bg-white/90 p-8 shadow-sm">
            <h2 className="mb-3 text-2xl font-bold text-zinc-900">
              Catalog unavailable
            </h2>
            <p className="mb-2 text-sm text-zinc-700">
              No products were returned from Cloudflare R2, so the gallery is
              empty.
            </p>
            <p className="text-sm text-zinc-700">
              Confirm your Cloudflare Pages environment variables include
              R2_S3_ENDPOINT or R2_ACCOUNT_ID, plus R2_ACCESS_KEY_ID,
              R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.
            </p>
            {isRecoveringCatalog ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Retrying from edge runtime...
              </p>
            ) : null}
          </section>
        ) : null}
        {activeCategory === "Categories"
          ? categoryCards.map((card, index) => (
              <Link
                key={card.category}
                href={`/?category=${encodeURIComponent(card.category)}`}
                onClick={() => setActiveCategory(card.category)}
                className="group block"
              >
                <article className="rounded-3xl border border-zinc-200 bg-white/85 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div
                    className="relative mb-4 aspect-5/4 overflow-hidden rounded-2xl bg-zinc-100"
                    data-secure-image
                  >
                    <ProductImage
                      src={card.image}
                      alt={`${card.category} collection`}
                      priority={index === 0}
                      className="transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-900/70">
                    {card.count} print{card.count === 1 ? "" : "s"}
                  </p>
                  <h2 className="text-2xl font-bold text-zinc-900">
                    {card.category}
                  </h2>
                </article>
              </Link>
            ))
          : paginatedProducts.map((product, index) => {
              const showArtist =
                product.artist.trim().toUpperCase() !== "UNFRAMED ARCHIVE";

              return (
                <article
                  key={product.id}
                  id={`gallery-item-${product.id}`}
                  className="group rounded-3xl border border-zinc-200 bg-white/85 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <Link
                    href={`/product/${product.id}?category=${encodeURIComponent(activeCategory)}&returnTo=${encodeURIComponent(product.id)}`}
                    className="block"
                  >
                    <div
                      className="relative mb-4 aspect-5/4 overflow-hidden rounded-2xl bg-zinc-100"
                      data-secure-image
                    >
                      <ProductImage
                        src={product.image}
                        alt={getProductAltText(product)}
                        priority={index === 0}
                        className="transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  </Link>
                  {showArtist ? (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-900/70">
                      {product.artist}
                    </p>
                  ) : null}
                  <h2 className="mb-2 text-2xl font-bold text-zinc-900">
                    {product.title}
                  </h2>
                  <p className="mb-2 text-sm text-zinc-600">{product.size}</p>
                  <p className="mb-4 text-sm text-zinc-600">
                    {product.description}
                  </p>
                  <Link
                    href={`/product/${product.id}?category=${encodeURIComponent(activeCategory)}&returnTo=${encodeURIComponent(product.id)}`}
                    className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-orange-50 transition hover:bg-zinc-700"
                  >
                    View details and order
                  </Link>
                </article>
              );
            })}
      </main>

      {activeCategory !== "Categories" && totalPages > 1 ? (
        <section className="mx-auto mt-8 flex w-full max-w-6xl items-center justify-center gap-2 px-6 md:px-10">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="rounded-full border border-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-800 transition enabled:hover:bg-zinc-900 enabled:hover:text-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={`h-10 w-10 rounded-full text-sm font-semibold transition ${
                  currentPage === page
                    ? "bg-zinc-900 text-orange-50"
                    : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                {page}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="rounded-full border border-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-800 transition enabled:hover:bg-zinc-900 enabled:hover:text-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </section>
      ) : null}

      <SiteFooter />

      {isCartOpen ? (
        <button
          type="button"
          aria-label="Close cart"
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 z-15 bg-zinc-900/30 backdrop-blur-xs"
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-20 h-full w-full max-w-md border-l border-zinc-200 bg-orange-50/95 p-6 shadow-xl backdrop-blur-md transition-transform duration-300 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-zinc-900">Your cart</h3>
          <button
            onClick={() => setIsCartOpen(false)}
            type="button"
            className="text-sm font-semibold text-zinc-700"
          >
            Close
          </button>
        </div>

        <div className="flex h-[calc(100%-8rem)] flex-col justify-between gap-4">
          <div className="space-y-3 overflow-y-auto pr-2">
            {cart.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-sm text-zinc-600">
                No prints yet. Add one from the gallery.
              </p>
            ) : (
              cart.map((item) => {
                const product = item.product;

                return (
                  <div key={item.lineId} className="rounded-xl bg-white p-4">
                    <p className="text-sm font-semibold text-zinc-900">
                      {product.title}
                    </p>
                    <p className="text-xs text-zinc-600">{item.variantLabel}</p>
                    <p className="mb-2 text-xs text-zinc-600">
                      x{item.quantity}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-700">
                        {formatPrice(item.unitPriceCents * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.lineId)}
                        type="button"
                        className="text-xs font-semibold uppercase tracking-wide text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-zinc-700">
              <span>Subtotal</span>
              <strong className="text-lg text-zinc-900">
                {formatPrice(subtotalCents)}
              </strong>
            </div>
            <button
              onClick={checkout}
              disabled={cart.length === 0 || isCheckingOut}
              type="button"
              className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-orange-50 transition enabled:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isCheckingOut ? "Starting checkout..." : "Checkout with Stripe"}
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              type="button"
              className="w-full rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear cart
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
