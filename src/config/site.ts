/**
 * Central brand + product configuration.
 *
 * Everything that a rename, repricing, or feature-flag change would touch lives
 * here so it never has to be hunted down across the component tree.
 */

/**
 * The site's own origin, used for canonical URLs, Open Graph tags, the sitemap,
 * and Stripe redirects.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — set this once a real domain is attached.
 *   2. Vercel's own production domain, exposed automatically on every build, so
 *      a fresh deployment has correct canonicals with nothing to configure.
 *   3. localhost, for development.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  // Vercel supplies this without a scheme (e.g. "projectkit.vercel.app").
  const vercelDomain = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelDomain) return `https://${vercelDomain.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

const rawSiteUrl = resolveSiteUrl();

export const site = {
  name: "ProjectKit",
  tagline: "Tell us what you're building. We'll figure out everything you need.",
  supportingLine:
    "Calculate materials, estimate costs, create a shopping list, and plan your project in minutes.",
  description:
    "ProjectKit turns a home project into material quantities, estimated costs, a shopping list, and a printable project plan.",
  url: rawSiteUrl,
  locale: "en_US",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@projectkit.example",
} as const;

/** Price of the paid Project Pack, in whole cents so Stripe never sees a float. */
export const projectPack = {
  priceCents: Number(process.env.NEXT_PUBLIC_PROJECT_PACK_PRICE_CENTS || 699),
  currency: (process.env.NEXT_PUBLIC_PROJECT_PACK_CURRENCY || "usd").toLowerCase(),
  name: "ProjectKit Project Pack",
} as const;

export function formatPackPrice(): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: projectPack.currency.toUpperCase(),
  }).format(projectPack.priceCents / 100);
}

/**
 * Feature flags. All of these degrade gracefully: the core planners keep
 * working whether or not any external credential is present.
 */
export const features = {
  /** Server-side check happens in lib/ai; this is the public-facing hint only. */
  naturalLanguageAi: process.env.NEXT_PUBLIC_AI_ENABLED === "true",
  ads: process.env.NEXT_PUBLIC_ADS_ENABLED === "true",
  affiliate: process.env.NEXT_PUBLIC_AFFILIATE_ENABLED !== "false",
  /*
   * Lets the Project Pack unlock without a real payment, for local dev + demos.
   *
   * Opt in, never opt out. This previously defaulted to on (`!== "false"`),
   * which meant any deployment that had not explicitly set the variable gave
   * the paid product away — the failure was silent and looked exactly like a
   * working site. A forgotten flag should cost a demo, not the revenue.
   *
   * The server routes additionally refuse it outright in production; see
   * lib/stripe.ts → devUnlockAllowed.
   */
  projectPackDevUnlock: process.env.NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK === "true",
  contractorLeads: process.env.NEXT_PUBLIC_CONTRACTOR_LEADS_ENABLED === "true",
} as const;

export const analyticsConfig = {
  /** Google Analytics measurement ID. Empty means no GA script is loaded. */
  measurementId: process.env.NEXT_PUBLIC_ANALYTICS_ID || "",
  debug: process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true",
  /**
   * Vercel custom events require Web Analytics Plus. Page views, visitors,
   * routes, referrers, and devices are collected on every plan and need no
   * flag — this only gates the product-event funnel.
   */
  vercelCustomEvents: process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS === "true",
} as const;

export const adsConfig = {
  clientId: process.env.NEXT_PUBLIC_AD_CLIENT_ID || "",
} as const;

/**
 * Affiliate destinations. These are configurable placeholders — ProjectKit does
 * not claim or imply any retailer relationship until a real ID is supplied.
 */
export const affiliateConfig = {
  enabled: features.affiliate,
  /** e.g. "https://www.example-retailer.com/search?q={query}&tag=projectkit-20" */
  searchUrlTemplate:
    process.env.NEXT_PUBLIC_AFFILIATE_SEARCH_URL ||
    "https://www.google.com/search?q={query}",
  partnerLabel: process.env.NEXT_PUBLIC_AFFILIATE_PARTNER_LABEL || "",
} as const;

export function affiliateSearchUrl(query: string): string {
  return affiliateConfig.searchUrlTemplate.replace(
    "{query}",
    encodeURIComponent(query),
  );
}

export const legal = {
  planningDisclaimer:
    "ProjectKit provides planning estimates only. Actual requirements, costs, installation methods, structural requirements, permits, safety requirements, and building codes vary. Verify critical specifications before purchasing materials or beginning work.",
  shortDisclaimer:
    "Planning estimate only — verify quantities and local requirements before you buy.",
  lastUpdated: "2026-08-18",
} as const;
