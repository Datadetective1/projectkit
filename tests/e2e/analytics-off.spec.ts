import { expect, test } from "@playwright/test";

/**
 * The default state: Google Analytics is not configured, and must be invisible.
 *
 * This runs in the *main* suite, whose server is built without a measurement
 * ID — which is also production's configuration today. Its job is the inverse
 * of tests/e2e/analytics.spec.ts: prove that nothing Google-related exists when
 * nobody asked for it.
 *
 * Vercel Web Analytics is a separate product on a separate script and is
 * expected to keep working throughout. Note what is asserted about it and what
 * is not: that its script is *present*, not that events are *delivered* —
 * Vercel's client declines automation traffic, so no headless test can honestly
 * claim delivery.
 */

const PAGES = ["/", "/concrete-calculator", "/concrete-calculator/10x10-slab"];

for (const path of PAGES) {
  test(`${path} loads no Google script when no measurement ID is set`, async ({ page }) => {
    const googleRequests: string[] = [];
    page.on("request", (request) => {
      if (/googletagmanager|google-analytics|analytics\.google/.test(request.url())) {
        googleRequests.push(request.url());
      }
    });

    await page.goto(path);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1200);

    expect(googleRequests, `requested ${googleRequests.join(", ")}`).toHaveLength(0);

    // Nothing in the markup either — no stub, no dataLayer, no gtag.
    expect(await page.locator("#pk-gtag-stub").count()).toBe(0);
    expect(await page.evaluate(() => typeof (window as never as { gtag?: unknown }).gtag)).toBe(
      "undefined",
    );
    expect(
      await page.evaluate(() => (window as never as { dataLayer?: unknown }).dataLayer),
    ).toBeUndefined();
  });
}

test("Vercel Web Analytics is untouched by the Google wiring", async ({ page }) => {
  /*
   * The two are independent by design: Vercel needs no configuration and
   * collects page views on every plan, while Google is entirely gated on an ID.
   * Turning Google off must not have turned Vercel off with it.
   */
  await page.goto("/concrete-calculator");
  await page.waitForLoadState("load");
  await page.waitForTimeout(800);

  // `window.va` is the queue stub the Vercel client installs on load.
  expect(await page.evaluate(() => typeof (window as never as { va?: unknown }).va)).toBe(
    "function",
  );
});

test("the planner still works with no analytics configured", async ({ page }) => {
  // Analytics must never be load-bearing. With every provider off, `track()`
  // is a no-op and the calculator has to behave exactly as it always did.
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");

  const headline = page.locator("#result-headline").locator("xpath=following-sibling::p[1]");
  await expect(headline).toHaveText("4.35 yd³");

  await page.getByRole("button", { name: "Calculate my project" }).click();
  await expect(headline).toBeVisible();
});
