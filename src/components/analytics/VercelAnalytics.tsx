"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { redactAnalyticsEvent } from "@/lib/analytics/redact";

/**
 * Vercel Web Analytics.
 *
 * This is a thin client wrapper rather than `<Analytics />` straight in the
 * root layout, for one reason: `beforeSend` is a function, and functions cannot
 * cross the server/client boundary. Wrapping keeps the root layout a server
 * component while still letting us redact every URL before it leaves the page.
 *
 * `mode` is left at its default of `auto`, so Vercel itself separates
 * production, preview, and local development traffic. Nothing here hard-codes a
 * hostname or labels localhost as production.
 */
export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => redactAnalyticsEvent(event)}
    />
  );
}
