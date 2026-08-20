import { track as vercelTrack } from "@vercel/analytics";
import { analyticsConfig } from "@/config/site";
import type { RetailerId } from "@/config/retailers";
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
   * Which material a retailer link was for — the calculation's own id, such as
   * `concrete-readymix` or `gravel-base`.
   *
   * Authored in the calculation files and provably invariant under user input:
   * see the "never lets a user's dimensions reach a search term" test, which
   * evaluates every planner at two different sizes and requires the ids and
   * terms to match. Never derived from anything typed.
   */
  materialId?: string;
  /** Which retailer earned an outbound click. */
  retailer?: RetailerId;
  /**
   * The kind of page an action started from.
   *
   * A six-token enum, never a path. The question this exists to answer is the
   * organic experiment's: do answer pages turn into planner starts? A raw
   * pathname would answer it too, and would also reintroduce exactly the
   * cardinality and leakage the redaction layer exists to prevent.
   */
  source?: AnalyticsSource;
}

/**
 * Where an action came from.
 *
 * Deliberately not "direct" — that describes a *referrer*, not a page, and
 * cannot be derived from a pathname. `other` covers everything unmapped rather
 * than inventing a category.
 */
export type AnalyticsSource =
  | "home"
  | "planner"
  | "answer"
  | "projects"
  | "plan"
  | "other";

/**
 * Classify a pathname into the closed `source` vocabulary.
 *
 * Takes the path rather than reading `location` so it is pure and testable, and
 * so a caller cannot accidentally hand it a full URL with a query string.
 */
/**
 * Where the visitor came *from*, for the event that opens the funnel.
 *
 * `sourceFromPath(pathname)` answers "which page did this happen on", which is
 * the right question for a click but the wrong one for `planner_started` — it
 * would report "planner" every time, since planners are where planners start.
 * The question worth answering is the organic experiment's: do the answer pages
 * send people into the tool?
 *
 * So this reads the referrer, and **only when it is our own origin**. An
 * external referrer is another site's URL: it is not ours to record, it can
 * carry a search query, and it would explode the vocabulary. Anything that is
 * not same-origin — an external site, a bookmark, a pasted link, an empty
 * referrer — collapses to `other`, which is honest about not knowing.
 */
/**
 * The last Cubitora page this visitor was on, within this page session.
 *
 * Needed because `document.referrer` does not survive client-side navigation:
 * Next moves between routes with the History API, which leaves the referrer
 * frozen at whatever loaded the document — usually empty. So a visitor going
 * from an answer page into the planner has no referrer at all, which is the
 * one journey this whole field exists to measure.
 *
 * Held in a module variable rather than storage: it is per-tab, it dies with
 * the page, and it holds one of six fixed tokens' worth of information.
 */
let currentPath: string | null = null;
let priorPath: string | null = null;

/**
 * Called by AnalyticsProvider on every route.
 *
 * Two variables rather than one, because a single "previous path" is only
 * correct if this always runs *after* the effects that read it — and it does
 * not. The planner sits behind Suspense, so on a fresh load its effects run
 * after the provider's, while on a client-side navigation they run before.
 * Depending on that ordering made the attribution report "planner" for a
 * direct visit and "answer" for a referred one, from the same code.
 *
 * Advancing only when the path actually changes removes the race: `priorPath`
 * is the page before this one whichever order the effects happen to run in.
 */
export function notePathChange(path: string): void {
  if (path === currentPath) return;
  priorPath = currentPath;
  currentPath = path;
}

/**
 * @param thisPath the path the caller is currently on, so the answer does not
 * depend on whether the provider's effect has run yet.
 */
export function entrySource(thisPath: string): AnalyticsSource {
  /*
   * Both orderings, handled explicitly rather than assumed.
   *
   * If `currentPath` is still some *other* page, the provider has not caught up
   * with this navigation yet and that other page is the one we came from. If it
   * has caught up, `priorPath` holds it. Reading both is what makes this give
   * the same answer whether the caller's effect runs before or after the
   * provider's — which, thanks to Suspense, varies by route.
   */
  if (currentPath && currentPath !== thisPath) return sourceFromPath(currentPath);
  if (priorPath) return sourceFromPath(priorPath);

  /*
   * Otherwise the referrer, and only when it is our own origin. An external
   * referrer is another site's URL: not ours to record, capable of carrying a
   * search query, and it would explode the vocabulary. Anything else — an
   * external site, a bookmark, a pasted link, no referrer — collapses to
   * `other`, which is honest about not knowing.
   */
  try {
    if (typeof document === "undefined" || !document.referrer) return "other";

    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) return "other";

    return sourceFromPath(referrer.pathname);
  } catch {
    return "other";
  }
}

export function sourceFromPath(pathname: string): AnalyticsSource {
  const path = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");

  if (path === "" || path === "/") return "home";
  if (path === "/projects") return "projects";
  if (path === "/plan") return "plan";

  const segments = path.split("/").filter(Boolean);
  if (segments[0]?.endsWith("-calculator")) {
    return segments.length > 1 ? "answer" : "planner";
  }
  return "other";
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

/**
 * Drop anything that is not a plain scalar, and bound string length. The type
 * already prevents free text; this is the runtime backstop.
 */
function sanitize(props: AnalyticsProps): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      if (value.length === 0 || value.length > 64) continue;
      clean[key] = value;
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      clean[key] = value;
    } else if (typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return clean;
}

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
