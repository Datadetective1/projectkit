import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end journeys.
 *
 * These cover the paths a real person takes, on both desktop and a phone
 * viewport. They assert on user-visible text rather than internals, so they
 * fail when the product breaks rather than when the markup moves.
 */

const PLANNER_SLUGS = [
  "concrete-calculator",
  "fence-calculator",
  "paint-calculator",
  "flooring-calculator",
  "mulch-calculator",
  "gravel-calculator",
  "drywall-calculator",
  "tile-calculator",
  "deck-calculator",
  "sod-calculator",
];

/** The planner's estimate card, once it has rendered a value. */
function headline(page: Page) {
  return page.locator("#result-headline").locator("xpath=following-sibling::p[1]");
}

/**
 * A planner input, scoped to the form. Shopping-list checkboxes carry prose
 * labels that can contain the same words as a field ("…the slab width"), so an
 * unscoped getByLabel is ambiguous.
 */
function field(page: Page, label: string) {
  return page.locator("form").getByLabel(label, { exact: true });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(1);
}

/* ------------------------------------------------ 1. homepage → concrete -- */

test("journey 1: homepage to a concrete estimate", async ({ page }) => {
  await page.goto("/");
  // The h1 carries the brand positioning; the prompt is the input label.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Plan the project");
  await expect(page.getByLabel(/what you.re building/i)).toBeVisible();

  await page.getByRole("link", { name: "Concrete", exact: false }).first().click();
  await expect(page).toHaveURL(/concrete-calculator/);

  await field(page, "Length").fill("20");
  await field(page, "Width").fill("16");
  await field(page, "Slab thickness").fill("4");
  await page.getByRole("button", { name: "Calculate my project" }).click();

  // 320 sq ft × 4 in = 3.95 yd³, +10% waste = 4.35 yd³
  await expect(headline(page)).toHaveText("4.35 yd³");
  await expect(page.getByText("Recommended purchase: 4.50 yd³", { exact: false })).toBeVisible();

  // Materials, cost, and the plain-English explanation are all present.
  // Materials render as a table on desktop and as cards on a phone, so match
  // whichever of the two the current viewport actually shows.
  await expect(page.getByRole("heading", { name: "Materials" })).toBeVisible();
  await expect(
    page.getByText("Ready-mix concrete (delivered)").filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("$990").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "What this means" })).toBeVisible();
});

test("changing an assumption recalculates immediately", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await expect(headline(page)).toHaveText("4.35 yd³");

  await page.getByRole("button", { name: "Customize estimate" }).click();
  await field(page, "Waste allowance").fill("0");

  await expect(headline(page)).toHaveText("3.95 yd³");
});

test("the what-if steppers change the estimate in place", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await expect(headline(page)).toHaveText("4.35 yd³");

  const whatIf = page.getByRole("region", { name: "What if…" });
  await expect(whatIf).toBeVisible();

  // Waste is an advanced option, but it is the assumption that moves the
  // number most — so it is reachable without opening the advanced panel.
  await whatIf.getByRole("button", { name: "Increase Waste allowance" }).click();
  await expect(headline(page)).toHaveText("4.39 yd³");

  // Raising the price raises the budget.
  const before = await whatIf.innerText();
  await whatIf.getByRole("button", { name: "Increase Ready-mix price" }).click();
  await whatIf.getByRole("button", { name: "Increase Ready-mix price" }).click();
  await expect(whatIf).not.toHaveText(before);

  // And the change is reflected in the form itself, not just this card.
  await page.getByRole("button", { name: "Customize estimate" }).click();
  await expect(field(page, "Waste allowance")).toHaveValue("11");
});

test("copy summary puts a readable plan on the clipboard", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Clipboard permissions are Chromium-only here");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/concrete-calculator");
  await page.getByRole("button", { name: "Copy summary" }).click();

  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("Concrete — Cubitora estimate");
  expect(text).toContain("4.35 yd³");
  expect(text).toContain("Ready-mix concrete (delivered)");
  expect(text).toContain("Planning estimate only");
  expect(text).not.toMatch(/NaN|undefined/);
});

/* ------------------------------------------ 2. natural-language routing -- */

test("journey 2: a plain-English request lands on a prefilled planner", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel(/what you.re building/i)
    .fill("I need a 6 foot privacy fence around a 75 by 110 backyard with one gate");
  await page.getByRole("button", { name: "Plan my project" }).click();

  await expect(page).toHaveURL(/fence-calculator/);
  await expect(page.getByText("We read your description as a fence project")).toBeVisible();

  await expect(field(page, "Yard length")).toHaveValue("75");
  await expect(field(page, "Yard width")).toHaveValue("110");
  await expect(field(page, "Fence height")).toHaveValue("6");
  await expect(field(page, "Number of gates")).toHaveValue("1");

  // 2 × (75 + 110) = 370 ft of fence line.
  await expect(page.getByText("370 ft").first()).toBeVisible();
});

test("an uninterpretable request offers the planners instead of failing", async ({ page }) => {
  await page.goto("/plan?q=" + encodeURIComponent("what is the weather tomorrow"));
  await expect(page.getByText("We could not tell which project that is")).toBeVisible();
  await expect(page.getByRole("heading", { name: "All planners" })).toBeVisible();
});

/* ------------------------------------------------------ 3. shopping list -- */

test("journey 3: the shopping list ticks off and remembers", async ({ page }) => {
  await page.goto("/concrete-calculator");

  const list = page.getByRole("region", { name: "Concrete shopping list" });
  await expect(list.getByText(/0 of \d+ ticked off/)).toBeVisible();

  await list.getByRole("checkbox").first().check();
  await expect(list.getByText(/1 of \d+ ticked off/)).toBeVisible();

  // The tick survives a save and reload.
  await page.getByRole("button", { name: "Save this project" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/my-projects");
  await page.getByRole("link", { name: "Open" }).first().click();
  await expect(page.getByRole("region", { name: "Concrete shopping list" }).getByText(/1 of \d+ ticked off/)).toBeVisible();
});

/* ------------------------------------------------- 4. save and reopen -- */

test("journey 4: a saved project reopens with its values", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await field(page, "Length").fill("30");
  await field(page, "Width").fill("12");
  await page.getByRole("button", { name: "Save this project" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/my-projects");
  await expect(
    page.getByRole("heading", { name: "Concrete — 30 × 12 ft" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open" }).first().click();
  await expect(field(page, "Length")).toHaveValue("30");
  await expect(field(page, "Width")).toHaveValue("12");
});

test("deleting a saved project empties the list", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.getByRole("button", { name: "Save this project" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/my-projects");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /^Delete/ }).first().click();

  await expect(page.getByText("No saved projects yet")).toBeVisible();
});

/* -------------------------------------------------- 5. project pack -- */

test("journey 5: the Project Pack previews and downloads", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.getByRole("button", { name: "Preview Project Pack" }).first().click();

  await expect(page).toHaveURL(/project-pack\//);
  await expect(page.getByRole("heading", { name: /Concrete — 20 × 16 ft/ })).toBeVisible();

  // Every pack section is present.
  for (const section of [
    "Project summary",
    "Materials & budget",
    "Shopping list",
    "Project sequence",
    "Assumptions used",
    "How it was calculated",
    "Notes",
  ]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }

  const download = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "Download PDF" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^cubitora-.*\.pdf$/);
});

test("a project pack for an unknown id explains itself", async ({ page }) => {
  await page.goto("/project-pack/does-not-exist");
  await expect(page.getByText("We could not find that project")).toBeVisible();
});

/* ------------------------------------------------ 6. mobile navigation -- */

test("journey 6: mobile navigation opens and routes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile menu only exists below the lg breakpoint");

  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();

  const nav = page.getByRole("navigation", { name: "Mobile" });
  await expect(nav).toBeVisible();

  await nav.getByRole("link", { name: "Paint", exact: true }).click();
  await expect(page).toHaveURL(/paint-calculator/);
  await expect(nav).toBeHidden();
});

/* -------------------------------------------------- 7. invalid inputs -- */

test("journey 7: invalid input is explained, never rendered as NaN", async ({ page }) => {
  await page.goto("/concrete-calculator");

  await field(page, "Length").fill("0");
  await expect(page.getByText("Must be greater than zero.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Calculate my project" })).toBeDisabled();

  await field(page, "Length").fill("");
  await expect(page.getByText("Enter a number.")).toBeVisible();

  await field(page, "Length").fill("20");
  await expect(headline(page)).toHaveText("4.35 yd³");

  // Out-of-range values are caught too.
  await field(page, "Slab thickness").fill("99");
  await expect(page.getByText(/Must be 24 in or less/)).toBeVisible();

  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/NaN|Infinity|undefined/);
});

test("malformed query parameters are ignored rather than trusted", async ({ page }) => {
  await page.goto("/concrete-calculator?length=abc&width=-5&thickness=%3Cscript%3E");

  // Falls back to defaults rather than breaking.
  await expect(field(page, "Length")).toHaveValue("20");
  await expect(field(page, "Width")).toHaveValue("16");
  await expect(headline(page)).toHaveText("4.35 yd³");
});

/* -------------------------------------------------- 8. unit switching -- */

test("journey 8: switching units converts without corrupting values", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await expect(headline(page)).toHaveText("4.35 yd³");

  await page.getByRole("button", { name: "Metric" }).click();

  await expect(field(page, "Length")).toHaveValue("6.096");
  await expect(field(page, "Width")).toHaveValue("4.877");
  // The result always reflects the values on screen: 6.096 × 4.877 × 0.1016 m
  // plus 10% waste is 3.32 m³, not the 3.33 m³ that 20 × 16 ft would give.
  await expect(headline(page)).toHaveText("3.32 m³");

  // And back again.
  await page.getByRole("button", { name: "US units" }).click();
  await expect(field(page, "Length")).toHaveValue("20");
  await expect(headline(page)).toHaveText("4.35 yd³");
});

/* ------------------------------------------------- 9. every calculator -- */

for (const slug of PLANNER_SLUGS) {
  test(`journey 9: ${slug} produces a usable estimate`, async ({ page }) => {
    await page.goto(`/${slug}`);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#result-headline")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Materials" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Project sequence" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "DIY or hire someone?" })).toBeVisible();

    const value = await headline(page).innerText();
    expect(value).not.toMatch(/NaN|Infinity|undefined|—/);

    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/NaN|Infinity/);

    await expectNoHorizontalOverflow(page);
  });
}

/* ------------------------------------------------------- extra checks -- */

test("the site pages all render", async ({ page }) => {
  for (const path of ["/projects", "/about", "/contact", "/privacy", "/terms", "/my-projects"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("an unknown route shows the 404 page rather than an error", async ({ page }) => {
  const response = await page.goto("/not-a-real-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "That page isn't here" })).toBeVisible();
});

test("robots and sitemap are served", async ({ page }) => {
  const robots = await page.request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const slug of PLANNER_SLUGS) {
    expect(xml).toContain(slug);
  }
});

test("planner pages carry the SEO metadata that matters", async ({ page }) => {
  await page.goto("/concrete-calculator");

  await expect(page).toHaveTitle(/Concrete Calculator/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/concrete-calculator$/,
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /concrete volume/i,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);

  const structured = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = structured.flatMap((raw) => {
    const parsed: unknown = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.map((item) => (item as { "@type"?: string })["@type"]);
  });
  expect(types).toContain("BreadcrumbList");
  expect(types).toContain("WebApplication");
  expect(types).toContain("FAQPage");
});

test("checkout rejects a malformed project reference", async ({ page }) => {
  const response = await page.request.post("/api/checkout", {
    data: { projectId: "../../etc/passwd" },
  });
  expect(response.status()).toBe(400);
});
