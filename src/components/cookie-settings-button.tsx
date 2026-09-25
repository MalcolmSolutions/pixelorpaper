"use client";

import { useCookiePreferences } from "@/context/cookie-preferences-context";

export function CookieSettingsButton() {
  const { openPreferences } = useCookiePreferences();

  return (
    <button
      type="button"
      onClick={openPreferences}
      className="text-xs uppercase tracking-[0.12em] text-zinc-700 underline-offset-2 transition hover:text-zinc-900 hover:underline"
    >
      Cookie settings
    </button>
  );
}
