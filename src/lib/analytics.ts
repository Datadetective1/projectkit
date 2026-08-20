import { track as vercelTrack } from "@vercel/analytics";
import { analyticsConfig } from "@/config/site";
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

export type AnalyticsEvent =
  | "project_started"
  | "project_completed"
  | "result_viewed"
  | "project_saved"
  | "project_shared"
  | "project_pack_previewed"
  | "project_pack_checkout_started"
  | "project_pack_purchased"
  | "project_pack_downloaded"
  | "affiliate_clicked"
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
}

type GtagWindow = Window & {
  gtag?: (command: string, ...args: unknown[]) => void;
  dataLayer?: unknown[];
};

/* ------------------------------------------------------------ providers -- */

export function isGoogleAnalyticsEnabled(): boolean {
  return Boolean(analyticsConfig.measurementId);
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
