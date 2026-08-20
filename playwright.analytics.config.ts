import { defineConfig, devices } from "@playwright/test";

/**
 * The GA4 suite, on its own server.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so proving that GA4 works
 * needs a build that has a measurement ID in it — and the main suite needs a
 * build that does *not*, both because it asserts no Google script loads and
 * because an external request to googletagmanager on every page would slow the
 * accessibility scans and perturb the Core Web Vitals measurements.
 *
 * Two builds is the honest way to test both states. This one runs alone:
 *
 *   npm run e2e:analytics
 *
 * The measurement ID below is a syntactically valid GA4 id that belongs to no
 * property. Events queue into `dataLayer`, which is what the tests read;
 * nothing is ever delivered to Google.
 */
const PORT = Number(process.env.PLAYWRIGHT_ANALYTICS_PORT || 3102);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /analytics\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],

  use: { baseURL, trace: "retain-on-failure", locale: "en-US" },

  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    /*
     * Never reuse. This config exists to test a build with specific
     * NEXT_PUBLIC_ values inlined into it, and those are baked at build time —
     * so reusing whatever happens to be listening on this port silently tests
     * the wrong bundle. That is exactly what happened while writing these
     * tests: three of them "failed" against a stale server that predated the
     * fix they were checking.
     */
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK: "true",
      /** A well-formed id for a property that does not exist. */
      NEXT_PUBLIC_ANALYTICS_ID: "G-TEST0000AA",
      /** Retailers on, so the retailer_click event has something to click. */
      NEXT_PUBLIC_WHERE_TO_BUY_ENABLED: "true",
      NEXT_PUBLIC_RETAILER_HOME_DEPOT_URL: "https://retailer.invalid/hd/{query}",
      NEXT_PUBLIC_RETAILER_AMAZON_URL: "https://retailer.invalid/az?k={query}",
      NEXT_PUBLIC_RETAILER_AMAZON_AFFILIATE: "true",
    },
  },
});
