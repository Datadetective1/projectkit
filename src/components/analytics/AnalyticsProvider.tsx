"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { analyticsConfig } from "@/config/site";
import { isAnalyticsEnabled, trackPageView } from "@/lib/analytics";

/**
 * Loads the analytics script only when an ID is configured, and only after the
 * page is interactive so it cannot affect Core Web Vitals.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const enabled = isAnalyticsEnabled();

  useEffect(() => {
    if (!enabled || !pathname) return;
    trackPageView(pathname);
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.measurementId}`}
        strategy="lazyOnload"
      />
      <Script id="pk-analytics-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${analyticsConfig.measurementId}', { anonymize_ip: true, send_page_view: false });`}
      </Script>
    </>
  );
}
