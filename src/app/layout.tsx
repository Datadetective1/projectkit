import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { VercelAnalytics } from "@/components/analytics/VercelAnalytics";
import { organizationJsonLd } from "@/lib/seo";
import { site } from "@/config/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0f5f52",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/*
          Scroll-revealed sections start at opacity 0 and are shown by an
          IntersectionObserver. With JavaScript off nobody sets that flag, so
          without this the page would render as a series of blank bands. Content
          is never allowed to be hostage to a decorative effect.
        */}
        <noscript>
          <style>{`.pk-reveal,.pk-stagger-item{opacity:1!important;transform:none!important}.pk-draw{stroke-dashoffset:0!important}`}</style>
        </noscript>
        <script
          type="application/ld+json"
          // Static, developer-authored JSON-LD — no user input reaches this.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <a href="#main" className="pk-skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {/* Page views, routes, referrers, and devices — one integration, whole app. */}
        <VercelAnalytics />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
