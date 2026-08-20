/**
 * Central brand + product configuration.
 *
 * Everything that a rename, repricing, or feature-flag change would touch lives
 * here so it never has to be hunted down across the component tree.
 */

/**
 * The canonical public host. Every absolute URL the site emits resolves here.
 *
 * It is the www host, deliberately: Vercel 308-redirects the apex to www, and
 * Google Search Console and Bing have both already accepted
 * https://www.cubitora.com/sitemap.xml. Changing this would orphan that.
 */
const CANONICAL_HOST = "www.cubitora.com";

/**
 * Hosts that count as "the real site" for indexability.
 *
 * Both, on purpose. The apex only ever redirects, but if a build somehow serves
 * it we want the page indexable with a canonical pointing at www — a duplicate
 * that self-corrects. The failure in the other direction is far worse: an
 * over-strict check marks production noindex and quietly removes a site that
 * search engines have already accepted.
 */
const PRODUCTION_HOSTS = ["www.cubitora.com", "cubitora.com"];

/**
 * The site's own origin, used for canonical URLs, Open Graph tags, the sitemap,
 * and Stripe redirects.
 *
 * Environment-aware on purpose. Hardcoding the production domain would make
 * every preview deployment claim to be cubitora.com — which breaks preview
 * testing and, worse, invites search engines to index a preview as the real
 * thing. Resolution order:
 *
 *   1. NEXT_PUBLIC_SITE_URL — an explicit override always wins.
 *   2. Production on Vercel → the canonical domain, so production is correct
 *      with nothing configured.
 *   3. A preview deployment → its own URL, so previews are self-consistent and
 *      never claim to be production.
 *   4. localhost, for development.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return `https://${CANONICAL_HOST}`;
  }

  // Vercel supplies these without a scheme (e.g. "cubitora-abc123.vercel.app").
  const previewDomain =
    process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (previewDomain) return `https://${previewDomain.replace(/\/+$/, "")}`;

  const productionDomain = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionDomain) return `https://${productionDomain.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

const rawSiteUrl = resolveSiteUrl();

export const site = {
  name: "Cubitora",
  domain: CANONICAL_HOST,
  /** The headline promise. Short enough to sit under the wordmark. */
  tagline: "Plan the project. Know what you need.",
  /** The invitation, used where the product asks for input. */
  prompt: "Tell us what you're building.",
  supportingLine:
    "Calculate materials, estimate costs, build a shopping list, and create a complete project plan.",
  description:
    "Cubitora turns a home project into material quantities, estimated costs, a shopping list, and a printable project plan.",
  url: rawSiteUrl,
  locale: "en_US",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@cubitora.com",
} as const;

/**
 * True when this build is serving the real site rather than a preview.
 *
 * Compared by host rather than by whole URL. An exact string match against a
 * single canonical URL is how this went wrong once already: production serves
 * www, the constant named the apex, and the live site would have shipped
 * robots "Disallow: /" and a noindex on every page.
 */
export const isProductionSite = (() => {
  try {
    return PRODUCTION_HOSTS.includes(new URL(rawSiteUrl).host);
  } catch {
    return false;
  }
})();

/**
 * The build this page was rendered from.
 *
 * Exists so a beta report of "the fence numbers look wrong" can be tied to a
 * deployment. Vercel exposes the commit SHA to the client automatically; a
 * short prefix is enough to identify a build and is public information anyway,
 * since the repository is public.
 */
function resolveBuildId(): string {
  const sha =
    process.env.NEXT_PUBLIC_BUILD_ID?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim();
  if (sha) return sha.slice(0, 7);
  return "dev";
}

export const build = {
  id: resolveBuildId(),
  /** Set by Vercel to production, preview, or development. */
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() || "local",
} as const;

/**
 * Price of the paid Project Pack, in whole cents so Stripe never sees a float.
 *
 * A malformed environment variable used to become NaN and travel all the way to
 * Stripe's line item. It now falls back to the default and the value is forced
 * to a whole, positive number of cents.
 */
function resolvePriceCents(): number {
  const raw = Number(process.env.NEXT_PUBLIC_PROJECT_PACK_PRICE_CENTS);
  if (!Number.isFinite(raw) || raw <= 0) return 699;
  return Math.round(raw);
}

export const projectPack = {
  priceCents: resolvePriceCents(),
  currency: (process.env.NEXT_PUBLIC_PROJECT_PACK_CURRENCY || "usd").toLowerCase(),
  name: "Cubitora Project Pack",
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
  /*
   * The Project Pack is free right now, as a deliberate product decision.
   *
   * Deliberately separate from the dev unlock above. That one is a convenience
   * that the server refuses in production; this one is a *stated state of the
   * product* and is honoured everywhere, including production. Keeping them
   * apart means "free during beta" never has to be expressed by leaving a
   * development flag switched on, which is exactly how the paid product got
   * given away by accident before.
   *
   * Opt in. With neither this nor Stripe configured the pack is unavailable
   * rather than free, and the unlock panel says so plainly.
   */
  projectPackFree: process.env.NEXT_PUBLIC_PROJECT_PACK_FREE === "true",
  /*
   * Beta labelling. Fails *open* — unlike every other flag here — because the
   * risk runs the other way: telling people the estimates are still being
   * validated when they are settled costs nothing, while staying silent about
   * it during a beta is the thing that misleads.
   */
  beta: process.env.NEXT_PUBLIC_BETA !== "false",
  contractorLeads: process.env.NEXT_PUBLIC_CONTRACTOR_LEADS_ENABLED === "true",
} as const;

/**
 * How someone gets the Project Pack right now. One answer, derived once, so
 * the panel, the API routes, and the entitlement store cannot disagree.
 */
export type PackAccess = "free" | "paid" | "unavailable";

export function packAccess(stripeConfigured: boolean): PackAccess {
  if (features.projectPackFree) return "free";
  return stripeConfigured ? "paid" : "unavailable";
}

/**
 * Where a beta tester reports a bad estimate.
 *
 * A hosted form if one is configured, otherwise a mailto. Deliberately not a
 * database: a link that reaches a human is worth more at this stage than a
 * ticketing system nobody reads.
 */
export const feedback = {
  url: process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() || "",
  email: process.env.NEXT_PUBLIC_FEEDBACK_EMAIL?.trim() || site.contactEmail,
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
 * Affiliate destinations. These are configurable placeholders — Cubitora does
 * not claim or imply any retailer relationship until a real ID is supplied.
 */
export const affiliateConfig = {
  enabled: features.affiliate,
  /** e.g. "https://www.example-retailer.com/search?q={query}&tag=cubitora-20" */
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
    "Cubitora provides planning estimates only. Actual requirements, costs, installation methods, structural requirements, permits, safety requirements, and building codes vary. Verify critical specifications before purchasing materials or beginning work.",
  shortDisclaimer:
    "Planning estimate only — verify quantities and local requirements before you buy.",
  lastUpdated: "2026-08-18",
} as const;
