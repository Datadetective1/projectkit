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

/**
 * `value` rather than `content`, which is why this needs a cast.
 *
 * TypeScript is right to reject it — `value` is not a valid attribute on a
 * `<meta>` element, and React would refuse to infer it. The cast is confined to
 * this one constant so the escape hatch is visible and cannot spread.
 */
const IMPACT_SITE_VERIFICATION = {
  name: "impact-site-verification",
  value: "4a7fdfb5-af37-4a97-95cd-97c3e3e18ae3",
} as React.MetaHTMLAttributes<HTMLMetaElement>;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        {/*
          Impact / Home Depot site-ownership verification.

          Not in the `metadata` export, and it is worth saying why rather than
          leaving it looking like an oversight: Next's `metadata.other` always
          renders `<meta name="…" content="…">`, and Impact's crawler looks for
          a `value` attribute. `content` is the correct HTML and `value` is not,
          but the checker is the checker — so this is written literally to match
          what Impact actually reads.

          Rendered in the document head rather than the body, so the token is
          never visible on the page. It is a public ownership proof, not a
          credential: it grants nothing, and it is meant to be readable by
          anyone fetching the page.
        */}
        <meta {...IMPACT_SITE_VERIFICATION} />
      </head>
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
