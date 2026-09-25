"use client";

import { useCookiePreferences } from "@/context/cookie-preferences-context";

export function CookieConsentBanner() {
  const { hydrated, isOpen, savedNotice } = useCookiePreferences();

  if (!hydrated) {
    return null;
  }

  return (
    <>
      {isOpen ? (
        <aside className="pointer-events-auto fixed bottom-4 left-4 right-4 z-9999 rounded-2xl border border-zinc-300 bg-white/95 p-4 shadow-xl backdrop-blur-sm md:left-auto md:w-104">
          <p className="mb-2 text-sm font-semibold text-zinc-900">
            Cookie preferences
          </p>
          <p className="mb-4 text-xs leading-relaxed text-zinc-700">
            We use analytics cookies to understand site performance and improve
            the shopping experience. You can update this choice anytime from
            Cookie settings in the footer.
          </p>
          <form
            action="/api/cookie-consent"
            method="post"
            className="flex items-center gap-2"
          >
            <button
              type="submit"
              name="choice"
              value="accepted"
              className="touch-manipulation rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-orange-50 transition hover:bg-zinc-700"
            >
              Accept analytics
            </button>
            <button
              type="submit"
              name="choice"
              value="rejected"
              className="touch-manipulation rounded-full border border-zinc-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-800 transition hover:bg-zinc-100"
            >
              Reject analytics
            </button>
          </form>
        </aside>
      ) : null}

      {savedNotice ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-9999 w-[min(92vw,32rem)] -translate-x-1/2">
          <p className="rounded-2xl border border-zinc-900 bg-zinc-900 px-5 py-3 text-center text-sm font-semibold uppercase tracking-widest text-orange-50 shadow-2xl shadow-zinc-900/20">
            Saved: {savedNotice}
          </p>
        </div>
      ) : null}
    </>
  );
}
