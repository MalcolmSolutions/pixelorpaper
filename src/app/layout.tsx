import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { ProtectImages } from "@/components/protect-images";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OPEN_GRAPH, SITE_ORIGIN } from "@/lib/seo";
import "./globals.css";

const DESCRIPTION =
  "Photographic prints of landscapes, cities, architecture and nature, printed to order in A5 to A2 or sold as digital downloads. Free UK delivery.";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "Pixel or Paper",
    template: "%s | Pixel or Paper",
  },
  description: DESCRIPTION,
  openGraph: OPEN_GRAPH,
  twitter: { card: "summary_large_image" },
  // Bing Webmaster Tools ownership check.
  verification: {
    other: { "msvalidate.01": "E13AD858A5C16246A329A7692B853B14" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${montserrat.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ProtectImages />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
