"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { analyticsConfig } from "@/config/site";
import { isGoogleAnalyticsEnabled, notePathChange, trackPageView } from "@/lib/analytics";

/**
 * Google Analytics 4.
 *
 * Loads nothing at all unless `NEXT_PUBLIC_ANALYTICS_ID` holds a well-formed
 * GA4 measurement ID. Vercel Web Analytics is entirely separate — it collects
 * page views, visitors, referrers, countries and devices on its own, needs no
 * ID, and is unaffected by everything here.
 *
 * Two bugs were fixed here, and both were the kind that produce data quietly
 * missing rather than an error anybody notices.
 *
 * **The entry page was being dropped.** Both scripts used to load with
 * `lazyOnload`, which runs during idle time *after* load — long after
 * hydration, and therefore long after the effect below fires. `window.gtag`
 * did not exist yet, `trackPageView` hit its own guard and returned, and the
 * first page view of every session was lost. GA4 would have recorded only
 * client-side navigations: precisely the wrong half, since the entry page is
 * the one the organic-search experiment is about.
 *
 * The fix is the shape of Google's own snippet, and it is why that snippet is
 * shaped this way: a tiny inline stub defines `dataLayer` and `gtag` during
 * HTML parse, so calls made before the library arrives queue instead of
 * vanishing. `gtag/js` stays `lazyOnload` and flushes the queue when it lands.
 * The stub is a few hundred bytes of inline script and issues no request, so
 * the Core Web Vitals position is unchanged.
 *
 * **The scripts were gated on the wrong condition.** They keyed off
 * "any analytics provider", which includes Vercel custom events. Switching
 * those on without a GA ID would have requested
 * `googletagmanager.com/gtag/js?id=` on every page — a broken call to Google
 * for no reason. The gate is now GA and only GA.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const enabled = isGoogleAnalyticsEnabled();

  useEffect(() => {
    if (!pathname) return;
    if (enabled) trackPageView(pathname);
    /*
     * Recorded whether or not Google is configured, and recorded *after* the
     * page view so `entrySource()` still sees the previous page while the
     * current one's events are firing.
     *
     * This is why it works: in the layout, `{children}` render before this
     * component, so a planner's effects run first and read the path they came
     * from — which is exactly the attribution the funnel needs.
     */
    notePathChange(pathname);
  }, [enabled, pathname]);

  if (!enabled) return null;

  const id = analyticsConfig.measurementId;

  return (
    <>
      {/*
        Rendered as a plain inline script rather than next/script so it executes
        during parse. `send_page_view: false` because page views are sent from
        trackPageView with a redacted path — GA4's own would read
        `location.href`, which on a planner URL is the user's dimensions.

        The id is validated against /^G-[A-Z0-9]{4,20}$/ before this renders,
        so nothing user-controlled can reach this string.
      */}
      <script
        id="pk-gtag-stub"
        dangerouslySetInnerHTML={{
          __html:
            `window.dataLayer=window.dataLayer||[];` +
            `window.gtag=function(){window.dataLayer.push(arguments)};` +
            `gtag('js',new Date());` +
            `gtag('config','${id}',{anonymize_ip:true,send_page_view:false});`,
        }}
      />
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="lazyOnload" />
    </>
  );
}
