import type { Metadata } from "next";
import { isProductionSite, site } from "@/config/site";

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  /** Set false for utility pages that should not be indexed. */
  index?: boolean;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    /*
     * Two reasons a page is not indexable, and the deployment is the one that
     * catches mistakes.
     *
     * NEXT_PUBLIC_SITE_URL applies to every environment unless it is scoped in
     * Vercel, so a preview can end up canonicalising to production while
     * serving an "Allow: /" robots.txt — a fully crawlable copy of the site
     * pointing at the real one. Whatever the canonical says, a build that is
     * not serving the canonical domain is not indexable.
     */
    robots:
      index && isProductionSite ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: site.name,
      locale: site.locale,
      images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/opengraph-image")],
    },
  };
}

/* ------------------------------------------------------- structured data -- */

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function webApplicationJsonLd(input: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript for interactive calculations.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free project calculations and shopping lists.",
    },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    description: site.description,
  };
}
