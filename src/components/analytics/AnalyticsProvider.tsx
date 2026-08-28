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
 * GA4 measurement ID. Vercel Web Analytics is an entirely separate product on a
 * separate script — it collects page views, visitors, referrers, countries and
 * devices on its own, needs no ID, and is untouched by anything here.
 *
 * Two bugs were fixed in this component, and both were the kind that produce
 * data quietly missing rather than an error anybody notices.
 *
 * **The entry page was being dropped.** Both scripts loaded with `lazyOnload`,
 * which runs during idle time *after* load — long after hydration, and
 * therefore long after the effect below fires. `window.gtag` did not exist yet,
 * `trackPageView` hit its own guard and returned, and the first page view of
 * every session was lost. GA4 would have recorded only client-side navigation:
 * precisely the wrong half, since the entry page is the one the organic-search
 * experiment is about.
 *
 * The fix is the shape of Google's own snippet, and it is why that snippet is
 * shaped this way: a tiny inline stub defines `dataLayer` and `gtag` during
 * HTML parse, so calls made before the library arrives queue instead of
 * vanishing. `gtag/js` stays `lazyOnload` and flushes the queue when it lands.
 * The stub is a few hundred bytes of inline script and issues no request, so
 * the Core Web Vitals position is unchanged.
 *
 * **The scripts were gated on the wrong condition.** They keyed off
 * `isAnalyticsEnabled()`, which is true when *any* provider is on — including
 * Vercel custom events. Switching those on without a GA ID would have requested
 * `googletagmanager.com/gtag/js?id=` on every page: a broken call to Google,
 * for no reason, on every render. The gate is now GA and only GA.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const enabled = isGoogleAnalyticsEnabled();

  useEffect(() => {
    if (!pathname) return;
    if (enabled) trackPageView(pathname);
    /*
     * Recorded whether or not Google is configured, and recorded *after* the
     * page view so the attribution below still sees the previous page while
     * this one's events are firing.
     *
     * `notePathChange` is what lets `entrySource()` answer "which page sent
     * them here" across a client-side navigation, where `document.referrer`
     * is frozen at whatever loaded the document. It stores a pathname in a
     * module variable and nothing else; no storage, no network, no ID.
     */
    notePathChange(pathname);
  }, [enabled, pathname]);

  if (!enabled) return null;

  const id = analyticsConfig.measurementId;

  return (
    <>
      {/*
        A plain inline script rather than next/script, so it executes during
        parse and `gtag` exists before anything can call it.

        `send_page_view: false` because page views are sent from
        `trackPageView` with a redacted path. GA4's own would read
        `location.href`, which on a planner URL is the dimensions the user
        typed.

        `anonymize_ip: true` used to sit beside it and has been removed. It is a
        Universal Analytics field; GA4 anonymises IP addresses always and does
        not accept the directive — so gtag did not consume it, it forwarded it
        as a *custom event parameter*, and live validation of the preview found
        `ep.anonymize_ip=true` riding on every single hit. It leaked nothing,
        being a constant we authored, but it was noise on every event and would
        have consumed one of the fifty custom-dimension slots had anyone
        registered it. Nothing about IP handling changes by dropping it.

        The id is validated against /^G-[A-Z0-9]{4,20}$/ before this renders,
        so nothing malformed — and nothing user-controlled — can reach this
        string.
      */}
      <script
        id="pk-gtag-stub"
        dangerouslySetInnerHTML={{
          __html:
            `window.dataLayer=window.dataLayer||[];` +
            `window.gtag=function(){window.dataLayer.push(arguments)};` +
            `gtag('js',new Date());` +
            `gtag('config','${id}',{send_page_view:false});`,
        }}
      />
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="lazyOnload" />
    </>
  );
}
