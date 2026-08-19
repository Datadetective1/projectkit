import { analyticsConfig } from "@/config/site";

/**
 * Analytics abstraction.
 *
 * A no-op unless a measurement ID is configured. Every call is wrapped so an
 * analytics failure can never take down a calculation — the worst case is a
 * dropped event.
 */

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

/** Deliberately narrow: no free-text, no PII, no user-entered strings. */
export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

type GtagWindow = Window & {
  gtag?: (command: string, ...args: unknown[]) => void;
  dataLayer?: unknown[];
};

export function isAnalyticsEnabled(): boolean {
  return Boolean(analyticsConfig.measurementId);
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  try {
    if (analyticsConfig.debug && typeof console !== "undefined") {
      console.debug("[analytics]", event, props);
    }
    if (typeof window === "undefined" || !isAnalyticsEnabled()) return;
    const gtag = (window as GtagWindow).gtag;
    if (typeof gtag !== "function") return;
    gtag("event", event, props);
  } catch {
    // Analytics must never break the product.
  }
}

export function trackPageView(path: string): void {
  try {
    if (typeof window === "undefined" || !isAnalyticsEnabled()) return;
    const gtag = (window as GtagWindow).gtag;
    if (typeof gtag !== "function") return;
    gtag("event", "page_view", { page_path: path });
  } catch {
    // Ignored by design.
  }
}
