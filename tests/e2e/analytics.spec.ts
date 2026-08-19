import { expect, test, type Page } from "@playwright/test";

/**
 * Vercel Web Analytics integration.
 *
 * The unit tests cover the redaction function in isolation; these check the
 * wiring — that the script is actually injected once, that the hook is
 * registered before the first page view is queued, and that a real URL full of
 * user input comes out clean on the other side.
 */

/* `va`, `vaq`, and `vam` are declared globally by @vercel/analytics. */

/** Waits for the client component to inject the script and register the hook. */
async function waitForAnalytics(page: Page): Promise<void> {
  await expect(page.locator('script[src*="/_vercel/insights"]')).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(() => (window.vaq ?? []).some((item) => item[0] === 'beforeSend')),
    )
    .toBe(true);
}

/** Runs the page's own registered beforeSend hook over a URL. */
async function redactViaPage(page: Page, url: string): Promise<string | null> {
  return page.evaluate((target) => {
    const queue = window.vaq ?? [];
    const entry = queue.find((item) => item[0] === "beforeSend");
    const hook = entry?.[1] as
      | ((event: { type: string; url: string }) => { url: string } | null)
      | undefined;
    if (typeof hook !== "function") return null;
    return hook({ type: "pageview", url: target })?.url ?? null;
  }, url);
}

test("the analytics script is injected exactly once", async ({ page }) => {
  await page.goto("/concrete-calculator");

  // Exactly one — a duplicate integration would double-count every page view.
  await expect(page.locator('script[src*="/_vercel/insights"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => typeof window.va)).toBe("function");
});

test("it is present on every page, from one root integration", async ({ page }) => {
  for (const path of ["/", "/fence-calculator", "/projects", "/about", "/my-projects"]) {
    await page.goto(path);
    await expect(page.locator('script[src*="/_vercel/insights"]'), path).toHaveCount(1);
  }
});

test("redaction is registered before the first page view is queued", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await waitForAnalytics(page);

  const order = await page.evaluate(() =>
    (window.vaq ?? []).map((item) => item[0]),
  );

  expect(order[0]).toBe("beforeSend");
  expect(order).toContain("pageview");
});

test("user input is stripped from the URL that would be reported", async ({ page }) => {
  // A planner opened from the natural-language router, dimensions and all.
  await page.goto("/concrete-calculator?length=20&width=16&thickness=6&from=nl");

  await waitForAnalytics(page);

  const redacted = await redactViaPage(page, page.url());
  expect(redacted).not.toBeNull();

  // The route and the "came via natural language" marker survive.
  expect(redacted).toContain("/concrete-calculator");
  expect(redacted).toContain("from=nl");

  // Nothing the user typed does.
  expect(redacted).not.toContain("length");
  expect(redacted).not.toContain("width");
  expect(redacted).not.toContain("thickness");
  // No leftover numeric input in the query string.
  expect(new URL(redacted!).search).toBe("?from=nl");
});

test("a natural-language description is never reported", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await waitForAnalytics(page);

  const redacted = await redactViaPage(
    page,
    `${new URL(page.url()).origin}/plan?q=${encodeURIComponent("I want a 20 by 16 concrete patio")}`,
  );

  expect(redacted).toBe(`${new URL(page.url()).origin}/plan`);
  expect(redacted).not.toContain("concrete");
});

test("a saved-project id and a Stripe session are never reported", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await waitForAnalytics(page);
  const origin = new URL(page.url()).origin;

  const redacted = await redactViaPage(
    page,
    `${origin}/project-pack/9f3c1e2a-1111-2222-3333-444455556666?session_id=cs_test_a1B2c3`,
  );

  expect(redacted).toBe(`${origin}/project-pack/[id]`);
  expect(redacted).not.toContain("9f3c1e2a");
  expect(redacted).not.toContain("cs_test");
});

test("analytics does not break navigation or the calculator", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page.getByRole("link", { name: "Concrete", exact: false }).first().click();
  await expect(page).toHaveURL(/concrete-calculator/);

  // The estimate still computes after a client-side navigation.
  const headline = page.locator("#result-headline").locator("xpath=following-sibling::p[1]");
  await expect(headline).toHaveText("4.35 yd³");

  // And recalculates.
  await page.locator("form").getByLabel("Length", { exact: true }).fill("30");
  await expect(headline).not.toHaveText("4.35 yd³");

  expect(errors).toEqual([]);
});
