# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Scope

The store is being built incrementally. Authentication, a database, payments, admin features and real cart logic are intentionally absent, so don't add them unless asked.

## Conventions

- Pages read product data only through the async functions in `src/lib/products.ts` and `src/lib/categories.ts`.
- Prices are integer pence in GBP, VAT-inclusive (UK store). Display them with `formatPrice()` from `src/lib/utils.ts`.
- Products and categories come from the Cloudflare R2 bucket (`src/lib/catalog.ts`, cached for an hour): each top-level folder is a category, each image a product, with optional details in `metadata/<filename>.json`. Pages use `src/lib/products.ts` and `src/lib/categories.ts`, never the catalog directly. The SVG artwork (`components/artwork.tsx`) is now decorative only (hero illustration). Don't hotlink or copy images from Adobe Stock, Etsy or other stores.
- Design system lives entirely in `src/app/globals.css` (Tailwind v4, no `tailwind.config.js`). Tailwind's default colour palette is disabled, so only brand tokens exist (`canvas`, `surface`, `ink`, `ink-muted`, `line`, `sand`, `sand-light`, `sage`); `sage` is reserved for nature collections. The site is light-only by design, with no dark mode.
- Use the custom primitives instead of re-creating them with raw utilities: `container-page`, `section`, `product-grid`, `btn` + `btn-primary|btn-outline|btn-accent` (+ `btn-sm`, `btn-block`), `link`, `nav-link`, `eyebrow`, `media-well` (set `--wall` inline), `chip` (selectable options/filters; selected via `aria-pressed`/`aria-current`, never `btn`), `snap-row` (mobile swipe row, pair with `md:grid`). Room illustration colours are the `--wall-*`, `--floor-*`, `--skirting` variables in `:root`, shared by `RoomMockup` and `media-well`. Spacing tokens `gutter`, `section`, `header` are responsive (e.g. `h-header`, `mt-section`). Headings get Montserrat and the fluid scale from base styles, so don't add font classes to `h1`–`h3`.
- Visual direction: generous white space, near-square corners (2–4px), thin warm-grey borders, borderless product cards with portrait 4:5 images, uppercase letter-spaced buttons. Desenio and Adobe Stock are layout references only; don't copy their text, assets or branding.
- Next.js 16: `params`/`searchParams` are Promises. Type pages with the generated global `PageProps<"/route">` / `LayoutProps<"/route">`.
- Unit tests use Node's built-in runner: `npm test` runs `src/**/*.test.ts` (TypeScript run directly, with the `@/` alias resolved by `scripts/test-alias.mjs`). Keep tested rules in pure modules, like `src/lib/download-rules.ts`. Verify changes with `npm test`, `npm run lint` and `npm run build`; the build also type-checks.
