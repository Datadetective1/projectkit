import { expect, test, type Page } from "@playwright/test";

/**
 * GA4, end to end, against a build carrying a test measurement ID.
 *
 * Runs under playwright.analytics.config.ts and nowhere else — see that file
 * for why this needs a build of its own. `dataLayer` is the assertion surface:
 * the stub pushes every call into it during HTML parse, so reading it proves
 * what GA4 *would* receive without anything leaving the browser.
 *
 * Google's own library is blocked below, so no request reaches googletagmanager
 * during these tests. The queue is what is being tested, and the queue is the
 * thing that was broken.
 */

/** One entry as gtag pushes it: ["event", name, params]. */
type Call = [string, string, Record<string, unknown>?];

async function dataLayer(page: Page): Promise<Call[]> {
  return page.evaluate(() => {
    const layer = (window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [];
    return layer.map((entry) => Array.from(entry) as Call);
  });
}

async function events(page: Page, name?: string) {
  const calls = await dataLayer(page);
  return calls
    .filter((call) => call[0] === "event" && (!name || call[1] === name))
    .map((call) => ({ name: call[1], params: call[2] ?? {} }));
}

test.beforeEach(async ({ page }) => {
  // Never call Google, even from a test. The stub queues regardless.
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
});

/* ------------------------------------------------------- the entry page -- */

test("the first page view is captured, not lost to lazy loading", async ({ page }) => {
  /*
   * The regression this suite exists for. Both scripts used to load with
   * `lazyOnload`, which runs after the effect that sends the page view — so
   * `window.gtag` did not exist yet and the entry page of every session was
   * silently dropped. GA4 would have recorded only client-side navigation.
   */
  await page.goto("/concrete-calculator/10x10-slab");

  /*
   * Polled rather than read after `load`. The page view is sent from an effect,
   * so it lands at hydration — which can be after the load event, making a
   * single read a race. Polling asserts the event *arrives*, which is the
   * actual claim; before the fix it never arrived at all and this still fails.
   */
  await expect
    .poll(async () => (await events(page, "page_view")).length, {
      message: "no page_view queued for the entry page",
      timeout: 10_000,
    })
    .toBeGreaterThan(0);

  const views = await events(page, "page_view");
  expect(views[0].params.page_path).toBe("/concrete-calculator/10x10-slab");
});

test("gtag exists before the library arrives", async ({ page }) => {
  // The property that makes the fix work: the stub defines gtag during parse,
  // so anything firing at hydration queues rather than vanishing.
  await page.goto("/");
  expect(await page.evaluate(() => typeof (window as never as { gtag?: unknown }).gtag)).toBe(
    "function",
  );
});

test("client-side navigation is still counted, once each", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("load");
  await page.getByRole("link", { name: /see all projects/i }).first().click();
  await page.waitForURL(/\/projects/);
  await expect
    .poll(async () => (await events(page, "page_view")).length, { timeout: 10_000 })
    .toBeGreaterThan(1);

  const paths = (await events(page, "page_view")).map((event) => event.params.page_path);
  expect(paths).toContain("/");
  expect(paths).toContain("/projects");
  expect(paths.filter((path) => path === "/projects")).toHaveLength(1);
});

/* ------------------------------------------------------------ the funnel -- */

test("planner_started fires with its source", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  await expect
    .poll(async () => (await events(page, "planner_started")).length, {
      message: "planner_started did not fire on a bare planner visit",
      timeout: 10_000,
    })
    .toBe(1);

  const [started] = await events(page, "planner_started");
  expect(started.params.projectType).toBe("concrete-calculator");
  // No referrer on a direct visit, so the honest answer is "other".
  expect(started.params.source).toBe("other");
  expect(started.params.prefilled).toBe(0);
});

test("planner_started reports the answer page that sent them", async ({ page }) => {
  /*
   * The whole reason `source` exists: the organic experiment needs to know
   * whether the answer pages feed the planner. Arriving from one has to be
   * distinguishable from arriving cold.
   */
  await page.goto("/concrete-calculator/10x10-slab");
  await page.getByRole("link", { name: /open the concrete planner/i }).click();
  await page.waitForSelector("#result-headline");
  await expect
    .poll(async () => (await events(page, "planner_started")).length, { timeout: 10_000 })
    .toBe(1);

  const [started] = await events(page, "planner_started");
  expect(started.params.source, "an answer-page referral was not attributed").toBe("answer");
  expect(started.params.prefilled).toBe(3);
});

test("planner_completed, project_saved and project_pack_opened all fire", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");

  await page.getByRole("button", { name: "Calculate my project" }).click();
  await page.waitForTimeout(300);
  const [completed] = await events(page, "planner_completed");
  expect(completed).toBeDefined();
  expect(completed.params.projectType).toBe("concrete-calculator");
  expect(completed.params.source).toBe("planner");
  expect(completed.params.system).toBe("us");

  await page.getByRole("button", { name: /^save/i }).first().click();
  await page.waitForTimeout(300);
  const [saved] = await events(page, "project_saved");
  expect(saved).toBeDefined();
  expect(saved.params.projectType).toBe("concrete-calculator");

  await page.getByRole("button", { name: /preview project pack/i }).first().click();
  await page.waitForTimeout(300);
  const [opened] = await events(page, "project_pack_opened");
  expect(opened).toBeDefined();
});

test("shopping_list_viewed fires only when the list is actually seen", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");

  // The list renders below the fold; a mount-time event would already be here.
  expect(await events(page, "shopping_list_viewed")).toHaveLength(0);

  await page.locator('section[aria-labelledby="shopping-list"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const seen = await events(page, "shopping_list_viewed");
  expect(seen).toHaveLength(1);
  expect(seen[0].params.placement).toBe("shopping_list");
  expect(seen[0].params.projectType).toBe("concrete-calculator");
});

test("retailer_click carries the retailer and the material", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  const list = page.locator('section[aria-labelledby="shopping-list"]');
  await list.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  /*
   * Suppress the navigation, keep the handler.
   *
   * `dataLayer` lives on the page, so anything that navigates away — including
   * removing `target` and letting the click through — destroys the evidence
   * before it can be read. Cancelling the default in the capture phase stops
   * the browser following the link while leaving React's own click handler to
   * run on the bubble phase, which is the thing under test.
   */
  const link = list.locator('a[href^="https://retailer.invalid"]').first();
  await link.evaluate((node) =>
    node.addEventListener("click", (event) => event.preventDefault(), true),
  );
  await link.click();
  await page.waitForTimeout(400);

  const [clicked] = await events(page, "retailer_click");
  expect(clicked, "retailer_click did not fire").toBeDefined();
  expect(["home_depot", "amazon"]).toContain(clicked.params.retailer);
  expect(clicked.params.materialId).toBeTruthy();
  expect(clicked.params.projectType).toBe("concrete-calculator");
  expect(clicked.params.source).toBe("planner");
});

test("project_pack_downloaded fires from the pack", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  await page.getByRole("button", { name: /preview project pack/i }).first().click();
  await page.waitForURL(/project-pack\//, { timeout: 25_000 });

  await page.getByRole("button", { name: /download pdf/i }).first().click();
  await page.waitForTimeout(3_000);

  expect(await events(page, "project_pack_downloaded")).not.toHaveLength(0);
});

/* ----------------------------------------------------------- the privacy -- */

test("no dimension, description or id ever reaches the queue", async ({ page }) => {
  /*
   * The test that matters most. Drive the parts of the product that put user
   * input into a URL, then read every value queued for Google and assert none
   * of it came from the person using the site.
   */
  await page.goto("/concrete-calculator?length=27&width=13&thickness=5");
  await page.waitForSelector("#result-headline");
  await page.getByRole("button", { name: "Calculate my project" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /preview project pack/i }).first().click();
  await page.waitForURL(/project-pack\//, { timeout: 25_000 });
  await page.waitForTimeout(500);

  /*
   * Checked per parameter value rather than by searching the whole serialised
   * blob. An earlier version matched bare numbers against the JSON, which hit
   * the timestamp in the `js` entry and the port in the origin — noise that
   * looks exactly like a leak and is not one.
   */
  const packId = new URL(page.url()).pathname.split("/").pop()!;
  const values = (await dataLayer(page))
    .flatMap((call) => Object.values(call[2] ?? {}))
    .filter((value): value is string => typeof value === "string");

  expect(values.length).toBeGreaterThan(0);
  for (const value of values) {
    expect(value, `a query string reached the queue: ${value}`).not.toContain("?");
    for (const marker of ["length=", "width=", "thickness="]) {
      expect(value, `${marker} reached the queue: ${value}`).not.toContain(marker);
    }
    expect(value, `a saved-project id reached the queue: ${value}`).not.toContain(packId);
  }
  // And the route pattern is what got reported instead.
  const paths = (await events(page, "page_view")).map((event) => event.params.page_path);
  expect(paths).toContain("/project-pack/[id]");
});

test("a typed description never reaches the queue", async ({ page }) => {
  await page.goto(`/plan?q=${encodeURIComponent("a 20 by 16 concrete patio for my mother")}`);
  await page.waitForLoadState("load");
  await page.waitForTimeout(600);

  const serialised = JSON.stringify(await dataLayer(page));
  for (const fragment of ["mother", "patio", "q=", "20%20by"]) {
    expect(serialised, `"${fragment}" reached the analytics queue`).not.toContain(fragment);
  }
});

test("page_location is redacted, never the raw href", async ({ page }) => {
  await page.goto("/concrete-calculator?length=31&width=19");
  await page.waitForLoadState("load");
  await page.waitForTimeout(400);

  for (const event of await events(page)) {
    const location = event.params.page_location;
    if (typeof location !== "string") continue;
    expect(location, `${event.name} leaked a query string`).not.toContain("?");
    // Checked by parameter name rather than by value: the test server's port
    // contains "31", so asserting on the bare number matched the origin.
    for (const param of ["length=", "width=", "thickness="]) {
      expect(location, `${event.name} leaked ${param}`).not.toContain(param);
    }
  }
});
