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
 * The measurement ID below is a syntactically valid GA4 id belonging to no
 * property, and the suite blocks googletagmanager outright. Events queue into
 * `dataLayer`, which is what the tests read; nothing is ever delivered to
 * Google, from this machine or from CI.
 *
 * Note what is *not* configured here: no retailer environment variables. Amazon
 * is a committed, approved programme in config/retailers.ts and needs none, and
 * injecting a fake Home Depot — as an earlier draft of this file did — would
 * have tested a retailer whose application was declined.
 */
const PORT = Number(process.env.PLAYWRIGHT_ANALYTICS_PORT || 3102);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /analytics-ga4\.spec\.ts/,
  /*
   * Serial, single worker. Each test reads a whole `dataLayer` and asserts on
   * how many of a given event are in it; parallel workers share nothing, but
   * they do share the one server, and the funnel tests are slow enough that
   * contention showed up as timeouts rather than as failures.
   */
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],

  use: { baseURL, trace: "retain-on-failure", locale: "en-US" },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    /*
     * The funnel is measured on phones too. `shopping_list_viewed` depends on
     * an IntersectionObserver against the viewport, and a 390px-wide screen is
     * where "below the fold" actually means something.
     */
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],

  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    /*
     * Never reuse. This config exists to test a build with specific
     * NEXT_PUBLIC_ values inlined into it, and those are baked at build time —
     * so reusing whatever happens to be listening on this port silently tests
     * the wrong bundle, which looks exactly like the code being broken.
     */
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK: "true",
      /** A well-formed id for a property that does not exist. */
      NEXT_PUBLIC_ANALYTICS_ID: "G-TEST0000AA",
    },
  },
});
