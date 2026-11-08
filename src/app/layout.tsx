import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { site } from "@/content/site";
import { isProductionDeployment, publicEnv } from "@/lib/env";
import "./globals.css";

const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin-opsz-normal.woff2", style: "normal", weight: "100 900" },
    { path: "./fonts/fraunces-latin-opsz-italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const manrope = localFont({
  src: [{ path: "./fonts/manrope-latin-wght-normal.woff2", style: "normal", weight: "200 800" }],
  variable: "--font-manrope",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "South Georgia & North Florida Photographer | Southstill",
    template: "%s | Southstill",
  },
  description: site.description,
  applicationName: site.shortName,
  openGraph: { siteName: site.shortName, locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
  robots: isProductionDeployment ? undefined : { index: false, follow: false },
  verification: publicEnv.googleSiteVerification ? { google: publicEnv.googleSiteVerification } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#F6F2EA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US" className={`${fraunces.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        {/* Enables scroll-reveal styles only when JS runs (CSS has a no-JS safety net). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js-reveal')" }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
