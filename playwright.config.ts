import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT || 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  /*
   * Capped locally as well as on CI. The accessibility specs run a full axe
   * scan per page, which is heavy enough that one worker per core starves the
   * others and they time out — producing a different set of "failures" on every
   * run, all of which pass in isolation. Three is comfortably fast and stable.
   */
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? "line" : [["list"]],

  use: {
    baseURL,
    trace: "retain-on-failure",
    // Every journey must work in the units the planner opens with.
    locale: "en-US",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],

  webServer: {
    // Tested against a production build — dev-only warnings and the dev
    // overlay would otherwise show up as flake.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK: "true",
    },
  },
});
