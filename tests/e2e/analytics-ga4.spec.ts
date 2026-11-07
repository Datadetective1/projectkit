import { expect, test, type Page } from "@playwright/test";

/**
 * GA4, end to end, against a build carrying a test measurement ID.
 *
 * Runs under playwright.analytics.config.ts and nowhere else — see that file
 * for why this needs a build of its own. `dataLayer` is the assertion surface:
 * the inline stub pushes every call into it during HTML parse, so reading it
 * proves what GA4 *would* receive without anything leaving the browser.
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

/** Polls until at least `count` of an event have queued, then returns them. */
async function waitForEvents(page: Page, name: string, count = 1) {
  await expect
    .poll(async () => (await events(page, name)).length, {
      message: `${name} never reached the queue`,
      timeout: 10_000,
    })
    .toBeGreaterThanOrEqual(count);
  return events(page, name);
}

/** Runs the planner and scrolls the shopping list into view. */
async function calculateConcrete(page: Page) {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  await page.getByRole("button", { name: "Calculate my project" }).click();
}

/**
 * Bring the "here's what you need" card fully into view.
 *
 * Needed because the card's observer waits for half of it to be on screen, and
 * on a phone the whole results column sits below the form — so a bare `goto`
 * never shows it. Centred rather than merely scrolled to: `scrollIntoViewIfNeeded`
 * parks an element at the nearest edge, which can leave less than half of it
 * visible and the event correctly unfired.
 */
async function revealShoppingCta(page: Page) {
  await page
    .locator("#next-step-heading")
    .evaluate((node) => node.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
}

/**
 * Open the Project Pack, waiting for the page to stop moving first.
 *
 * The teaser now sits in the deeper block below the shopping list, so reaching
 * it involves a scroll — and Playwright refuses to click a moving target. This
 * settles the scroll before clicking rather than retrying into a timeout.
 */
async function openProjectPack(page: Page) {
  const button = page.getByRole("button", { name: /preview project pack/i }).first();
  await button.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await button.click();
  await page.waitForURL(/project-pack\//, { timeout: 25_000 });
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
   * silently dropped. GA4 would have recorded only client-side navigation:
   * precisely the wrong half, since the entry page is the one the organic
   * search experiment is about.
   */
  await page.goto("/concrete-calculator/10x10-slab");

  /*
   * Polled rather than read after `load`. The page view is sent from an effect,
   * so it lands at hydration — which can be after the load event, making a
   * single read a race. Polling asserts the event *arrives*, which is the
   * actual claim; before the fix it never arrived at all, and this still fails.
   */
  const views = await waitForEvents(page, "page_view");
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

test("the entry page is counted exactly once", async ({ page }) => {
  /*
   * The failure in the other direction. A stub that queued *and* a
   * `send_page_view` that GA4 sent itself would double-count every landing,
   * and every rate computed against it would read half of what it should.
   */
  await page.goto("/concrete-calculator");
  await waitForEvents(page, "page_view");
  await page.waitForTimeout(1_500);

  const views = await events(page, "page_view");
  expect(views).toHaveLength(1);

  // `send_page_view: false` is what holds this true. Assert the config that
  // makes it so, not just today's count.
  const config = (await dataLayer(page)).find((call) => call[0] === "config");
  expect(config, "no gtag config call was queued").toBeDefined();
  expect((config![2] as Record<string, unknown>).send_page_view).toBe(false);
});

test("client-side navigation is still counted, once each", async ({ page }) => {
  await page.goto("/");
  await waitForEvents(page, "page_view");
  await page.getByRole("link", { name: /see all projects/i }).first().click();
  await page.waitForURL(/\/projects/);
  await waitForEvents(page, "page_view", 2);

  const paths = (await events(page, "page_view")).map((event) => event.params.page_path);
  expect(paths).toContain("/");
  expect(paths).toContain("/projects");
  expect(paths.filter((path) => path === "/projects")).toHaveLength(1);
  expect(paths.filter((path) => path === "/")).toHaveLength(1);
});

/* ------------------------------------------------------------ the funnel -- */

test("planner_started fires for everyone, with its source", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");

  const started = await waitForEvents(page, "planner_started");
  expect(started).toHaveLength(1);
  expect(started[0].params.projectType).toBe("concrete-calculator");
  // No referrer on a typed-in visit, which is what `direct` means.
  expect(started[0].params.source).toBe("direct");
  expect(started[0].params.prefilled).toBe(0);
});

test("planner_started reports the answer page that sent them", async ({ page }) => {
  /*
   * The whole reason `source` exists: the organic experiment needs to know
   * whether the answer pages feed the planner. Arriving from one has to be
   * distinguishable from arriving cold, and a client-side navigation leaves no
   * referrer behind — so this is the case that would silently report `direct`
   * if the path history were wrong.
   */
  await page.goto("/concrete-calculator/10x10-slab");
  await page.getByRole("link", { name: /open the concrete planner/i }).click();
  await page.waitForSelector("#result-headline");

  const started = await waitForEvents(page, "planner_started");
  expect(started).toHaveLength(1);
  expect(started[0].params.source, "an answer-page referral was not attributed").toBe("answer");
});

test("planner_completed and project_saved fire with their source", async ({ page }) => {
  await calculateConcrete(page);

  const completed = await waitForEvents(page, "planner_completed");
  expect(completed[0].params.projectType).toBe("concrete-calculator");
  expect(completed[0].params.source).toBe("planner");
  expect(completed[0].params.system).toBe("us");
  expect(completed[0].params.mode).toBe("quick");

  await page.getByRole("button", { name: /^save/i }).first().click();
  const saved = await waitForEvents(page, "project_saved");
  expect(saved[0].params.projectType).toBe("concrete-calculator");
  expect(saved[0].params.source).toBe("planner");
});

test("project_pack_opened fires once, from the pack page", async ({ page }) => {
  /*
   * It used to fire twice on this journey: once on the planner's button and
   * again when the pack page mounted. That inflated the single number sitting
   * between "finished a calculation" and "downloaded a plan".
   */
  await calculateConcrete(page);
  await openProjectPack(page);

  const opened = await waitForEvents(page, "project_pack_opened");
  await page.waitForTimeout(1_000);

  expect(await events(page, "project_pack_opened")).toHaveLength(1);
  expect(opened[0].params.projectType).toBe("concrete-calculator");
  // The pack page is not one of the five named kinds of page.
  expect(opened[0].params.source).toBe("other");
});

test("project_pack_downloaded fires from the pack", async ({ page }) => {
  await calculateConcrete(page);
  await openProjectPack(page);

  await page.getByRole("button", { name: /download pdf/i }).first().click();

  const downloaded = await waitForEvents(page, "project_pack_downloaded");
  expect(downloaded[0].params.projectType).toBe("concrete-calculator");
});

test("shopping_cta_viewed fires when the offer reaches the screen", async ({ page }) => {
  /*
   * The event that makes a low click count interpretable. Without it, few
   * retailer clicks cannot be told apart from "nobody saw the offer" — which is
   * exactly the ambiguity the user research surfaced and this redesign fixes.
   */
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  await revealShoppingCta(page);

  const viewed = await waitForEvents(page, "shopping_cta_viewed");
  expect(viewed).toHaveLength(1);
  expect(viewed[0].params.projectType).toBe("concrete-calculator");
  expect(viewed[0].params.placement).toBe("result_summary");
  expect(viewed[0].params.itemsReady).toBe(7);
});

test("shopping_cta_clicked names which control was used", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  await revealShoppingCta(page);
  await waitForEvents(page, "shopping_cta_viewed");

  await page.getByRole("button", { name: /view shopping list/i }).click();

  const clicked = await waitForEvents(page, "shopping_cta_clicked");
  expect(clicked).toHaveLength(1);
  expect(clicked[0].params.placement).toBe("result_summary");
  expect(clicked[0].params.projectType).toBe("concrete-calculator");
  expect(clicked[0].params.itemsReady).toBe(7);
  expect(clicked[0].params.source).toBe("planner");
});

test("itemsReady counts what one tap buys, even where the materials come by truck", async ({ page }) => {
  /*
   * itemsReady is the same number the card and the cart button show. Mulch
   * itself arrives by the load, but a tool on its list goes in the cart.
   */
  await page.goto("/mulch-calculator");
  await page.waitForSelector("#result-headline");
  await revealShoppingCta(page);

  const viewed = await waitForEvents(page, "shopping_cta_viewed");
  // Mulch itself arrives by the load; the one item is a tool in the cart.
  expect(viewed[0].params.itemsReady).toBe(1);
  expect(viewed[0].params.projectType).toBe("mulch-calculator");
});

test("shopping_list_viewed carries how much of the list is buyable", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  await page.locator("#shopping-list").scrollIntoViewIfNeeded();

  const seen = await waitForEvents(page, "shopping_list_viewed");
  expect(seen[0].params.itemsReady).toBe(7);
});

test("shopping_list_viewed fires only when the list is actually seen", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  await waitForEvents(page, "planner_started");

  /*
   * The claim being defended: this event means somebody reached the list, not
   * that a component below the fold mounted. The list renders with the results
   * on first paint, so a mount-time event would already be in the queue here.
   */
  const list = page.locator("#shopping-list");
  await expect(list).toBeAttached();
  expect(
    await events(page, "shopping_list_viewed"),
    "fired before the list was anywhere near the viewport",
  ).toHaveLength(0);

  await list.scrollIntoViewIfNeeded();

  const seen = await waitForEvents(page, "shopping_list_viewed");
  expect(seen).toHaveLength(1);
  expect(seen[0].params.placement).toBe("shopping_list");
  expect(seen[0].params.projectType).toBe("concrete-calculator");
  expect(seen[0].params.source).toBe("planner");
});

test("shopping_list_viewed fires once, not on every scroll past", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  const list = page.locator("#shopping-list");

  await list.scrollIntoViewIfNeeded();
  await waitForEvents(page, "shopping_list_viewed");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await list.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  expect(await events(page, "shopping_list_viewed")).toHaveLength(1);
});

test("retailer_click names the retailer, the material and the source", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  const list = page.locator("#shopping-list");
  await list.scrollIntoViewIfNeeded();

  const link = list.locator('a[href*="amazon.com"]').first();
  await expect(link, "no Amazon link rendered in the shopping list").toBeVisible();

  /*
   * Suppress the navigation, keep the handler.
   *
   * `dataLayer` lives on the page, so anything that navigates away — including
   * the new tab this link would open — risks losing the evidence before it can
   * be read. Cancelling the default in the capture phase stops the browser
   * following the link while leaving React's own handler to run on the bubble
   * phase, which is the thing under test.
   */
  await link.evaluate((node) =>
    node.addEventListener("click", (event) => event.preventDefault(), true),
  );
  await link.click();

  const clicked = await waitForEvents(page, "retailer_click");
  expect(clicked[0].params.retailer).toBe("amazon");
  expect(clicked[0].params.projectType).toBe("concrete-calculator");
  expect(clicked[0].params.materialId).toBeTruthy();
  expect(String(clicked[0].params.materialId)).toMatch(/^[a-z0-9-]+$/);
  expect(clicked[0].params.source).toBe("planner");
  expect(clicked[0].params.placement).toBe("shopping_list");
});

test("the affiliate link itself is unchanged by the tracking", async ({ page }) => {
  /*
   * The measurement work must not have touched what Amazon requires. Asserted
   * on the rendered DOM rather than on the config, because the config being
   * right is not the same as the link being right.
   */
  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  const list = page.locator("#shopping-list");
  await list.scrollIntoViewIfNeeded();

  const link = list.locator('a[href*="amazon.com"]').first();
  await expect(link).toHaveAttribute("href", /tag=cubitora86-20/);
  await expect(link).toHaveAttribute("rel", /sponsored/);
  await expect(link).toHaveAttribute("target", "_blank");

  /*
   * The visible marker sits beside the button rather than inside its label. It
   * moved when the link became a button: "Shop on Amazon (paid link)" reads as
   * part of the action, which is worse both as a call to action and as a
   * disclosure. The screen-reader sentence stays inside the link, where it
   * belongs.
   */
  await expect(list.getByText("Paid link").first()).toBeVisible();
  await expect(link).toContainText("a paid affiliate link");

  // The Associates disclosure is at the head of the list, near the links.
  await expect(list).toContainText(/As an Amazon Associate/i);
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
  await openProjectPack(page);
  await waitForEvents(page, "project_pack_opened");

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
    expect(value, `a fragment reached the queue: ${value}`).not.toContain("#");
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
  await waitForEvents(page, "page_view");
  await page.waitForTimeout(600);

  const serialised = JSON.stringify(await dataLayer(page));
  for (const fragment of ["mother", "patio", "q=", "20%20by"]) {
    expect(serialised, `"${fragment}" reached the analytics queue`).not.toContain(fragment);
  }
});

test("page_location is redacted on every event, never the raw href", async ({ page }) => {
  await page.goto("/concrete-calculator?length=31&width=19#my-note");
  await page.waitForSelector("#result-headline");
  await page.getByRole("button", { name: "Calculate my project" }).click();
  await waitForEvents(page, "planner_completed");

  const all = await events(page);
  expect(all.length).toBeGreaterThan(2);

  for (const event of all) {
    const location = event.params.page_location;
    expect(typeof location, `${event.name} sent no page_location at all`).toBe("string");
    expect(location, `${event.name} leaked a query string`).not.toContain("?");
    expect(location, `${event.name} leaked a fragment`).not.toContain("#");
    // Checked by parameter name rather than by value: the test server's port
    // contains "31", so asserting on the bare number matched the origin.
    for (const param of ["length=", "width=", "thickness="]) {
      expect(location, `${event.name} leaked ${param}`).not.toContain(param);
    }
  }
});

test("every parameter on every event is in the closed vocabulary", async ({ page }) => {
  /*
   * The schema, asserted against what actually goes over the wire rather than
   * against the type that produced it. A new call site passing a field nobody
   * agreed to is exactly the drift this is here to catch.
   */
  const ALLOWED = new Set([
    "projectType",
    "materialId",
    "retailer",
    "source",
    "mode",
    "placement",
    "method",
    "system",
    "prefilled",
    "itemsReady",
    "checked",
    "page_path",
    "page_location",
  ]);

  await page.goto("/concrete-calculator");
  await page.waitForSelector("#result-headline");
  await page.getByRole("button", { name: "Calculate my project" }).click();
  await page.getByRole("button", { name: /^save/i }).first().click();
  const list = page.locator("#shopping-list");
  await list.scrollIntoViewIfNeeded();
  await waitForEvents(page, "shopping_list_viewed");

  for (const event of await events(page)) {
    for (const key of Object.keys(event.params)) {
      expect(ALLOWED.has(key), `${event.name} sent an undeclared parameter: ${key}`).toBe(true);
    }
  }
});

test("Vercel Web Analytics is still present alongside Google", async ({ page }) => {
  /*
   * The two are independent products on separate scripts, and adding one must
   * not have displaced the other. Asserted as *present*, not as delivering:
   * Vercel's client declines automation traffic, so no headless test can
   * honestly claim an event arrived.
   */
  await page.goto("/concrete-calculator");
  await expect(page.locator('script[src*="/_vercel/insights"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => typeof window.va)).toBe("function");
});
