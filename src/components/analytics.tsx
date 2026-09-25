"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  getStoredCookieConsent,
} from "@/lib/cookie-consent";

interface GoogleAnalyticsProps {
  gaId: string;
}

declare global {
  interface Window {
    gtag: (command: string, ...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const readConsent = () => {
      setHasConsent(getStoredCookieConsent() === "accepted");
    };

    readConsent();

    const onStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_STORAGE_KEY) {
        readConsent();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    // Track page views
    if (typeof window !== "undefined" && hasConsent && window.gtag) {
      window.gtag("event", "page_view", {
        page_path: window.location.pathname,
        page_title: document.title,
      });
    }
  }, [hasConsent]);

  if (!gaId || !hasConsent) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              send_page_view: false,
            });
          `,
        }}
      />
    </>
  );
}

// Helper function for tracking events
export function trackEvent(
  eventName: string,
  eventData: Record<string, unknown>,
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventData);
  }
}

// Track product view
export function trackProductView(
  productId: string,
  title: string,
  price: number,
) {
  trackEvent("view_item", {
    items: [
      {
        item_id: productId,
        item_name: title,
        price: price / 100,
        currency: "GBP",
      },
    ],
  });
}

// Track add to cart
export function trackAddToCart(
  productId: string,
  title: string,
  price: number,
) {
  trackEvent("add_to_cart", {
    items: [
      {
        item_id: productId,
        item_name: title,
        price: price / 100,
        currency: "GBP",
      },
    ],
  });
}

// Track begin checkout
export function trackBeginCheckout(
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
) {
  trackEvent("begin_checkout", {
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price / 100,
      quantity: item.quantity,
      currency: "GBP",
    })),
  });
}

// Track purchase
export function trackPurchase(
  transactionId: string,
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  total: number,
) {
  trackEvent("purchase", {
    transaction_id: transactionId,
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price / 100,
      quantity: item.quantity,
      currency: "GBP",
    })),
    value: total / 100,
    currency: "GBP",
  });
}
