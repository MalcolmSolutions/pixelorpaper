"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type CookieConsentChoice,
  clearSavedCookieConsentNotice,
  getStoredCookieConsent,
  readSavedCookieConsentNotice,
  setStoredCookieConsent,
} from "@/lib/cookie-consent";

type CookiePreferencesContextValue = {
  hydrated: boolean;
  isOpen: boolean;
  savedNotice: CookieConsentChoice | null;
  openPreferences: () => void;
  saveChoice: (choice: CookieConsentChoice) => void;
};

const CookiePreferencesContext =
  createContext<CookiePreferencesContextValue | null>(null);

export function CookiePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [choice, setChoice] = useState<CookieConsentChoice | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [savedNotice, setSavedNotice] = useState<CookieConsentChoice | null>(
    null,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedChoice = getStoredCookieConsent();
      const savedNoticeChoice = readSavedCookieConsentNotice();

      if (storedChoice) {
        setChoice(storedChoice);
      }

      if (savedNoticeChoice) {
        setSavedNotice(savedNoticeChoice);
        clearSavedCookieConsentNotice();
      }

      setHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const openPreferences = () => {
    setShowPreferences(true);
  };

  const saveChoice = (nextChoice: CookieConsentChoice) => {
    setStoredCookieConsent(nextChoice);
    setChoice(nextChoice);
    setShowPreferences(false);
    setSavedNotice(nextChoice);
  };

  useEffect(() => {
    if (!savedNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSavedNotice(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [savedNotice]);

  const value = useMemo<CookiePreferencesContextValue>(
    () => ({
      hydrated,
      isOpen: hydrated && (showPreferences || choice === null),
      savedNotice,
      openPreferences,
      saveChoice,
    }),
    [choice, hydrated, savedNotice, showPreferences],
  );

  return (
    <CookiePreferencesContext.Provider value={value}>
      {children}
    </CookiePreferencesContext.Provider>
  );
}

export function useCookiePreferences() {
  const context = useContext(CookiePreferencesContext);
  if (!context) {
    throw new Error(
      "useCookiePreferences must be used within CookiePreferencesProvider",
    );
  }

  return context;
}
