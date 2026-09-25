import type { Metadata } from "next";
import { Syne, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { CookiePreferencesProvider } from "@/context/cookie-preferences-context";
import { GoogleAnalytics } from "@/components/analytics";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { WebVitalsReporter } from "@/components/web-vitals";
import { ImageSecurityWrapper } from "@/components/image-security-wrapper";
import { siteSeo } from "@/lib/seo";

const heading = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
  preload: false,
  display: "swap",
});

const body = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteSeo.defaultTitle,
    template: "%s | Pixel or Paper",
  },
  description: siteSeo.defaultDescription,
  keywords: siteSeo.keywords,
  applicationName: "Pixel or Paper",
  authors: [{ name: "Malcolm Rose" }],
  creator: "Malcolm Rose",
  publisher: siteSeo.legalName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteSeo.defaultTitle,
    description: siteSeo.defaultDescription,
    url: "/",
    siteName: siteSeo.name,
    images: [
      {
        url: "/images/pixelorpaperLogo.png",
        alt: "Pixel or Paper logo",
      },
    ],
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: siteSeo.defaultTitle,
    description: siteSeo.defaultDescription,
    images: ["/images/pixelorpaperLogo.png"],
    creator: "@pixelorpaper",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "art",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || "";
  const imageBaseUrl =
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL ||
    "https://pub-b000034b4d0a4300a99ec3ffdae75820.r2.dev";

  return (
    <html lang="en">
      <head>
        {/* Preconnect to image CDN for faster loading */}
        <link rel="preconnect" href={imageBaseUrl} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={imageBaseUrl} />
      </head>
      <body className={`${heading.variable} ${body.variable}`}>
        <CartProvider>
          <CookiePreferencesProvider>
            <ImageSecurityWrapper>
              {children}
              <CookieConsentBanner />
              <GoogleAnalytics gaId={gaId} />
              <WebVitalsReporter />
            </ImageSecurityWrapper>
          </CookiePreferencesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
