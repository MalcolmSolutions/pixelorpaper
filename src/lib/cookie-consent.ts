export const COOKIE_CONSENT_STORAGE_KEY = "pixelorpaper-cookie-consent";
export const COOKIE_CONSENT_NOTICE_KEY = "pixelorpaper-cookie-consent-saved";

export type CookieConsentChoice = "accepted" | "rejected";

function readCookieConsentFromDocument(): CookieConsentChoice | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${COOKIE_CONSENT_STORAGE_KEY}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(COOKIE_CONSENT_STORAGE_KEY.length + 1);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function getStoredCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (stored === "accepted" || stored === "rejected") {
      return stored;
    }

    return readCookieConsentFromDocument();
  } catch {
    return readCookieConsentFromDocument();
  }
}

export function setStoredCookieConsent(choice: CookieConsentChoice): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
    document.cookie = `${COOKIE_CONSENT_STORAGE_KEY}=${choice}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Ignore storage errors (e.g. strict privacy mode) and keep in-memory state.
  }
}

export function readSavedCookieConsentNotice(): CookieConsentChoice | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${COOKIE_CONSENT_NOTICE_KEY}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(COOKIE_CONSENT_NOTICE_KEY.length + 1);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function clearSavedCookieConsentNotice(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${COOKIE_CONSENT_NOTICE_KEY}=; path=/; max-age=0; samesite=lax`;
}
