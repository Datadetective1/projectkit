import { track as vercelTrack } from "@vercel/analytics";
import { analyticsConfig } from "@/config/site";
import { RETAILER_IDS, type RetailerId } from "@/config/retailers";
import { redactPathname, redactUrl } from "@/lib/analytics/redact";

/**
 * Product analytics abstraction.
 *
 * Two providers sit behind one `track()` call:
 *
 *  - **Vercel Web Analytics** handles page views, visitors, routes, referrers,
 *    countries, and devices on its own — see components/analytics. Nothing in
 *    this file is needed for any of that.
 *  - **Custom product events** (the funnel below) are forwarded to whichever
 *    providers are configured. Vercel's custom events are a paid tier, so that
 *    path is off unless explicitly switched on; Google Analytics is used if a
 *    measurement ID is present. With neither configured every call is a no-op.
 *
 * Every call is wrapped so an analytics failure can never take down a
 * calculation — the worst case is a dropped event.
 */

/* --------------------------------------------------------------- schema -- */

/**
 * The funnel, named after what a person did rather than what the code calls it.
 *
 * The seven marked below are the intent funnel — landing through to an outbound
 * click — and they are deliberately named for the journey:
 *
 *   planner_started → planner_completed → project_pack_opened →
 *   project_pack_downloaded → shopping_list_viewed → retailer_click
 *
 * with `project_saved` as the parallel signal of someone intending to come
 * back. Everything after them is supporting detail.
 *
 * **These were renamed.** `project_started` became `planner_started`,
 * `project_pack_previewed` became `project_pack_opened`, `affiliate_clicked`
 * became `retailer_click`. Renaming an event normally means losing the history
 * behind it — here there is none to lose, because nothing has ever been
 * recorded (see the audit note in components/analytics/VercelAnalytics.tsx).
 * That makes today the last free moment to fix the names, and after the first
 * real event lands it stops being free.
 */
export type AnalyticsEvent =
  /* -- the intent funnel ------------------------------------------------- */
  | "planner_started"
  | "planner_completed"
  | "project_pack_opened"
  | "project_pack_downloaded"
  | "shopping_list_viewed"
  | "retailer_click"
  | "project_saved"
  /* -- supporting signals ------------------------------------------------ */
  | "result_viewed"
  | "project_shared"
  | "project_pack_checkout_started"
  | "project_pack_purchased"
  | "related_project_clicked"
  | "natural_language_submitted"
  | "natural_language_routed"
  | "units_changed"
  | "shopping_list_item_toggled";

/**
 * Event metadata is deliberately categorical and closed-vocabulary.
 *
 * Every field is either a project slug, a fixed token, or a small number. There
 * is no field for a dimension, a price, a note, or anything the user typed —
 * the type simply does not allow one, so a careless call site cannot leak.
 */
export interface AnalyticsProps {
  /** Project slug, e.g. "concrete-calculator". */
  projectType?: string;
  /** Which tier of the form was in use. */
  mode?: "quick" | "advanced";
  /** Where in the page an action was taken. */
  placement?: "results" | "materials" | "pack" | "shopping_list";
  /** How something was shared or unlocked. */
  method?: "web_share" | "clipboard" | "copy_summary" | "print_list";
  /** Measurement system in use. */
  system?: "us" | "metric";
  /** Count of fields prefilled by the natural-language router. */
  prefilled?: number;
  /** Whether a checklist item was ticked on or off. */
  checked?: boolean;
  /**
   * Which material a line refers to — the calculation's own id, such as
   * `ready-mix`, `drywall-sheets` or `base-gravel`.
   *
   * Authored as a string literal in `lib/calculations/*.ts` and provably
   * invariant under user input: the same planner run at two different sizes
   * produces the same ids. It is not unique on its own — `ready-mix` exists
   * under both concrete and gravel — so the key is `projectType` +
   * `materialId`, which is how a report should group it.
   */
  materialId?: string;
  /** Which retailer earned an outbound click. A fixed union, never a name. */
  retailer?: RetailerId;
  /**
   * The kind of page an action started from.
   *
   * A seven-token enum, never a path. The question this exists to answer is
   * the organic experiment's: do the answer pages turn into planner usage? A
   * raw pathname would answer it too, and would also reintroduce exactly the
   * cardinality and the leakage that the redaction layer exists to prevent.
   */
  source?: AnalyticsSource;
}

/* ----------------------------------------------------- source attribution -- */

/**
 * Where an action came from.
 *
 * `direct` and `other` are different answers and both are honest. `direct` is
 * GA's own sense of the word — no referrer at all, so a typed URL, a bookmark,
 * or a link that suppressed its referrer. `other` is an internal page outside
 * the five named kinds, or an external site we decline to record. Collapsing
 * the two would claim knowledge we do not have.
 */
export type AnalyticsSource =
  | "home"
  | "planner"
  | "answer"
  | "projects"
  | "plan"
  | "direct"
  | "other";

/** Every value `source` may take. Exported so a test can assert the closure. */
export const ANALYTICS_SOURCES: readonly AnalyticsSource[] = [
  "home",
  "planner",
  "answer",
  "projects",
  "plan",
  "direct",
  "other",
] as const;

/**
 * Classify a pathname into the closed `source` vocabulary.
 *
 * Takes a pathname rather than reading `location` so it is pure and testable,
 * and it defends itself anyway: a caller who hands it a full path with a query
 * string still gets one of seven tokens back, never the string it was given.
 */
export function sourceFromPath(pathname: string): AnalyticsSource {
  const path = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");

  if (path === "" || path === "/") return "home";
  if (path === "/projects") return "projects";
  if (path === "/plan") return "plan";

  const segments = path.split("/").filter(Boolean);
  if (segments[0]?.endsWith("-calculator")) {
    // `/concrete-calculator` is the planner; `/concrete-calculator/10x10-slab`
    // is one of the SEO answer pages that sit under it.
    return segments.length > 1 ? "answer" : "planner";
  }
  return "other";
}

/**
 * The last Cubitora page this visitor was on, within this page session.
 *
 * Needed because `document.referrer` does not survive client-side navigation:
 * Next moves between routes with the History API, which leaves the referrer
 * frozen at whatever loaded the document. So a visitor going from an answer
 * page into a planner has no referrer describing that hop — and that hop is
 * the one journey this whole field exists to measure.
 *
 * Held in module variables rather than storage: they are per-tab, they die with
 * the page, and between them they hold one of seven fixed tokens' worth of
 * information about where somebody was.
 */
let currentPath: string | null = null;
let priorPath: string | null = null;

/**
 * Called by AnalyticsProvider on every route change.
 *
 * Two variables rather than one, because a single "previous path" is only
 * correct if this always runs *after* the effects that read it — and it does
 * not. The planner sits behind Suspense, so on a fresh load its effects run
 * after the provider's, while on a client-side navigation they run before.
 * Advancing only when the path actually changes removes that race.
 */
export function notePathChange(path: string): void {
  if (path === currentPath) return;
  priorPath = currentPath;
  currentPath = path;
}

/** Test seam. Not called by the product. */
export function resetPathHistoryForTests(): void {
  currentPath = null;
  priorPath = null;
}

/**
 * Where the visitor came *from*, for the event that opens the funnel.
 *
 * `sourceFromPath(pathname)` answers "which page did this happen on", which is
 * right for a click but wrong for `planner_started` — it would report
 * `planner` every time, since planners are where planners start. The question
 * worth answering is the organic experiment's: do the answer pages send people
 * into the tool?
 *
 * @param thisPath the path the caller is currently on, so the answer does not
 * depend on whether the provider's effect has run yet.
 */
export function entrySource(thisPath: string): AnalyticsSource {
  /*
   * Both effect orderings, handled explicitly rather than assumed. If
   * `currentPath` is still some *other* page, the provider has not caught up
   * with this navigation and that other page is the one we came from. If it
   * has caught up, `priorPath` holds it.
   */
  if (currentPath && currentPath !== thisPath) return sourceFromPath(currentPath);
  if (priorPath) return sourceFromPath(priorPath);

  /*
   * Otherwise the referrer, and only when it is our own origin. An external
   * referrer is another site's URL: not ours to record, capable of carrying
   * somebody's search query, and it would explode the vocabulary. No referrer
   * at all is `direct`; an external one is `other`.
   */
  try {
    if (typeof document === "undefined" || typeof window === "undefined") return "direct";
    if (!document.referrer) return "direct";

    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) return "other";

    return sourceFromPath(referrer.pathname);
  } catch {
    return "other";
  }
}

type GtagWindow = Window & {
  gtag?: (command: string, ...args: unknown[]) => void;
  dataLayer?: unknown[];
};

/* ------------------------------------------------------------ providers -- */

/**
 * A GA4 measurement ID, not merely a non-empty string.
 *
 * The shape is checked rather than the length because this value is
 * interpolated into an inline script and into a script `src`. Validating it
 * here means a typo, a stray quote, or a half-filled environment variable can
 * never become markup — the scripts simply do not render.
 */
const GA4_MEASUREMENT_ID = /^G-[A-Z0-9]{4,20}$/;

export function isGoogleAnalyticsEnabled(): boolean {
  return GA4_MEASUREMENT_ID.test(analyticsConfig.measurementId);
}

/**
 * Vercel custom events require Web Analytics Plus. Sending them on the free
 * tier would be a silent no-op on Vercel's side, so rather than pretend to
 * collect data we keep the path switched off until it is actually available.
 */
export function isVercelCustomEventsEnabled(): boolean {
  return analyticsConfig.vercelCustomEvents;
}

/** True when at least one provider will actually receive product events. */
export function isAnalyticsEnabled(): boolean {
  return isGoogleAnalyticsEnabled() || isVercelCustomEventsEnabled();
}

/* --------------------------------------------------------------- sanitise -- */

/**
 * The exact values each categorical field may take.
 *
 * Listing them is not belt-and-braces over the TypeScript union — it is the
 * only protection that survives compilation. Types are erased at runtime, so a
 * plain JavaScript caller, a cast, or a `props` object built from a variable
 * reaches `track()` completely unchecked.
 */
const ALLOWED_VALUES: Partial<Record<keyof AnalyticsProps, ReadonlySet<string>>> = {
  mode: new Set(["quick", "advanced"]),
  placement: new Set(["results", "materials", "pack", "shopping_list"]),
  method: new Set(["web_share", "clipboard", "copy_summary", "print_list"]),
  system: new Set(["us", "metric"]),
  source: new Set(ANALYTICS_SOURCES),
  retailer: new Set(RETAILER_IDS),
};

/**
 * The two string fields that are identifiers rather than enums, and the shape
 * they are held to.
 *
 * `projectType` is a project slug and `materialId` is an id written as a string
 * literal in lib/calculations. Both are lower-case kebab, both are short, and
 * neither is ever assembled from input. Anything that does not look like one is
 * dropped rather than truncated — a truncated leak is still a leak.
 */
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SLUG_FIELDS: ReadonlySet<string> = new Set(["projectType", "materialId"]);

/** The one numeric field, and the one boolean. */
const NUMBER_FIELDS: ReadonlySet<string> = new Set(["prefilled"]);
const BOOLEAN_FIELDS: ReadonlySet<string> = new Set(["checked"]);

/**
 * Reduce a props object to the fields the schema declares, with the values the
 * schema allows. Everything else is dropped silently.
 *
 * **This is an allowlist of keys, not merely of types, and the difference is
 * the whole point.** The previous version kept any string under 64 characters
 * whatever it was called, so a call site that added `notes` or `description`
 * — or a future refactor that spread a form object into the props — would have
 * shipped exactly the free text this schema exists to exclude, past a type that
 * had already been erased. A field that is not named below cannot be sent, and
 * adding one is a deliberate edit to this file.
 */
function sanitize(props: AnalyticsProps): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    const allowed = ALLOWED_VALUES[key as keyof AnalyticsProps];
    if (allowed) {
      if (typeof value === "string" && allowed.has(value)) clean[key] = value;
      continue;
    }

    if (SLUG_FIELDS.has(key)) {
      if (typeof value === "string" && SLUG.test(value)) clean[key] = value;
      continue;
    }

    if (NUMBER_FIELDS.has(key)) {
      if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
      continue;
    }

    if (BOOLEAN_FIELDS.has(key)) {
      if (typeof value === "boolean") clean[key] = value;
      continue;
    }

    // Unrecognised field. Not truncated, not coerced — not sent.
  }

  return clean;
}

/**
 * `retailer_click` is the only event that names a retailer, and it must.
 *
 * The terminal step of the funnel is the one whose meaning is worth defending:
 * it has to mean "somebody clicked through to an approved retailer", not
 * "somebody clicked an outbound link". Requiring the field in the type is what
 * makes a call site that cannot name a retailer fail to compile, rather than
 * quietly contributing an unattributable row to the number this whole exercise
 * exists to produce.
 */
export interface RetailerClickProps extends AnalyticsProps {
  retailer: RetailerId;
}

export function track(event: "retailer_click", props: RetailerClickProps): void;
export function track(
  event: Exclude<AnalyticsEvent, "retailer_click">,
  props?: AnalyticsProps,
): void;
export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  try {
    const payload = sanitize(props);

    if (analyticsConfig.debug && typeof console !== "undefined") {
      console.debug("[analytics]", event, payload);
    }
    if (typeof window === "undefined") return;

    if (isVercelCustomEventsEnabled()) {
      vercelTrack(event, payload);
    }

    if (isGoogleAnalyticsEnabled()) {
      const gtag = (window as GtagWindow).gtag;
      // GA4 stamps every event with `page_location` read straight from
      // `document.location.href`. On a planner URL that href is the user's
      // dimensions, so the redacted value has to be supplied explicitly — the
      // closed `AnalyticsProps` vocabulary does not protect this field.
      if (typeof gtag === "function") {
        gtag("event", event, { ...payload, page_location: redactUrl(window.location.href) });
      }
    }
  } catch {
    // Analytics must never break the product.
  }
}

/**
 * Page views are collected by Vercel Web Analytics automatically, including
 * client-side navigation. This only exists to mirror them into Google
 * Analytics when that is configured.
 */
export function trackPageView(path: string): void {
  try {
    if (typeof window === "undefined" || !isGoogleAnalyticsEnabled()) return;
    const gtag = (window as GtagWindow).gtag;
    if (typeof gtag !== "function") return;

    /*
     * Both fields have to be set, and both have to be redacted.
     *
     * `page_path` alone is not enough: GA4 fills `page_location` from
     * `document.location.href` when we do not supply it, which would ship the
     * planner's entire query string — every dimension the user typed — to
     * Google. Passing a redacted absolute URL overrides that.
     *
     * `page_referrer` is left alone. It is the previous *site*, not our own
     * URL, so it carries no Cubitora user input.
     */
    gtag("event", "page_view", {
      page_path: redactPathname(path),
      page_location: redactUrl(window.location.href),
    });
  } catch {
    // Ignored by design.
  }
}
