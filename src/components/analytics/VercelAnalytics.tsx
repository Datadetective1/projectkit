"use client";

import { Analytics } from "@vercel/analytics/react";
import { usePathname } from "next/navigation";
import { redactAnalyticsEvent, redactPathname } from "@/lib/analytics/redact";

/**
 * Vercel Web Analytics.
 *
 * Two reasons this is a wrapper rather than `<Analytics />` in the root layout:
 *
 * 1. `beforeSend` is a function, and functions cannot cross the server/client
 *    boundary. Wrapping keeps the root layout a server component.
 *
 * 2. The `@vercel/analytics/next` entry point derives the reported route from
 *    `useParams()`, which collapses all ten planners — they share the dynamic
 *    `app/[slug]` route — into a single `/[slug]` row. That makes "which
 *    calculator gets the most traffic?" unanswerable. Reporting the pathname
 *    instead keeps `/concrete-calculator` and `/fence-calculator` distinct.
 *
 * The one path that genuinely should be grouped is `/project-pack/<id>`, whose
 * segment identifies a single user's saved project; `redactPathname` turns that
 * into `/project-pack/[id]`.
 *
 * Passing `route` also disables the script's own auto-tracking, so page views
 * are emitted here and only here — no double counting. The effect re-runs on
 * `usePathname()` changes, so client-side navigation is tracked too.
 *
 * `mode` stays at its default of `auto`, letting Vercel separate production,
 * preview, and local development itself. Nothing here hard-codes a hostname.
 */
export function VercelAnalytics() {
  const pathname = usePathname();
  const route = redactPathname(pathname ?? "/");

  return (
    <Analytics
      framework="next"
      route={route}
      path={route}
      // Vercel injects these so the script is served from a first-party,
      // ad-blocker-resistant path. Reading them keeps that behaviour, which the
      // /next entry point would otherwise have handled for us.
      basePath={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH}
      configString={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
      beforeSend={redactAnalyticsEvent}
    />
  );
}
