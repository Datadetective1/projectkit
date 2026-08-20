import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { answerPages } from "../../src/data/answers";

/**
 * Automated accessibility checks against WCAG 2.1 A and AA.
 *
 * Automation catches roughly a third of real accessibility problems, so these
 * sit alongside the manual keyboard and screen-reader checks rather than
 * replacing them — but a regression here is always a genuine regression.
 */

const PAGES = [
  { path: "/", name: "homepage" },
  { path: "/projects", name: "projects index" },
  { path: "/concrete-calculator", name: "concrete planner" },
  { path: "/deck-calculator", name: "deck planner" },
  { path: "/my-projects", name: "my projects" },
  { path: "/about", name: "about" },
  { path: "/privacy", name: "privacy" },
  { path: "/plan?q=nonsense", name: "plan fallback" },
  /*
   * Answer pages, derived rather than listed. They are dense with tables and
   * numeric columns, which is exactly the markup that fails a contrast or
   * header-association check quietly — and adding one must not be a decision
   * about whether to test it.
   */
  ...answerPages.map((page) => ({
    path: `/${page.planner}/${page.slug}`,
    name: `answer: ${page.seo.breadcrumb}`,
  })),
];

function audit(page: Page) {
  return new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);
}

/**
 * Scan the page once it has stopped moving.
 *
 * The results panel fades its lines in over ~320ms. axe computes contrast from
 * the element's *current* opacity, so scanning mid-fade measures a frame that
 * is on its way to being legible and reports it as a contrast failure — which
 * is why this failed only on the slower project, and only sometimes. WCAG
 * applies to the state the page settles in, so wait for it.
 *
 * This waits for animations to finish, not for a fixed delay: a real
 * regression — a colour that is genuinely too light — still fails, because the
 * finished state is exactly what gets measured.
 */
async function scan(page: Page) {
  await page
    .waitForFunction(
      () => document.getAnimations().every((animation) => animation.playState === "finished"),
      undefined,
      { timeout: 2_000 },
    )
    .catch(() => {
      // A page with a genuinely infinite animation should still be audited.
    });
  return audit(page).analyze();
}

for (const target of PAGES) {
  test(`${target.name} has no automatically detectable accessibility violations`, async ({
    page,
  }) => {
    await page.goto(target.path);
    const results = await scan(page);

    // Surface the rule and the offending markup, not just a count.
    const summary = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.html.slice(0, 160)),
    }));

    expect(JSON.stringify(summary, null, 2)).toBe("[]");
  });
}

test("the expanded planner options are accessible", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.getByRole("button", { name: "Customize estimate" }).click();
  await page.getByRole("button", { name: "How this was calculated" }).click();

  const results = await scan(page);
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("the project pack is accessible", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.getByRole("button", { name: "Preview Project Pack" }).first().click();
  await expect(page).toHaveURL(/project-pack\//);

  const results = await scan(page);
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("the planner is fully operable from the keyboard", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard traversal is a desktop concern");

  await page.goto("/concrete-calculator");

  // The skip link is the first thing a keyboard user reaches.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  // Tab into the form and change a value without touching the mouse.
  await page.locator("form").getByLabel("Length", { exact: true }).focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("24");
  await expect(page.locator("form").getByLabel("Length", { exact: true })).toHaveValue("24");

  // The primary action is reachable and activates with Enter.
  await page.getByRole("button", { name: "Calculate my project" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#result-headline")).toBeVisible();
});

test("the results region announces changes", async ({ page }) => {
  await page.goto("/concrete-calculator");
  // The headline is a live region so a screen reader hears the new estimate.
  const headline = page.locator("#result-headline").locator("xpath=following-sibling::p[1]");
  await expect(headline).toHaveAttribute("aria-live", "polite");
});

/**
 * States the page-level sweep above never reaches. Each is a different DOM:
 * an error message has to be associated with its field, an empty state is the
 * only thing on the page, and metric mode re-renders every number.
 */

test("a planner in its error state is accessible", async ({ page }) => {
  await page.goto("/concrete-calculator");
  const length = page.getByLabel(/length/i).first();
  await length.fill("0");
  await length.blur();

  // The error has to actually be showing, or this proves nothing.
  await expect(page.getByText(/must be|enter a/i).first()).toBeVisible();

  const results = await scan(page);
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("the empty saved-projects state is accessible", async ({ page }) => {
  await page.goto("/my-projects");
  await expect(page.getByText(/no saved projects yet/i)).toBeVisible();

  const results = await scan(page);
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("metric mode is accessible", async ({ page }) => {
  await page.goto("/concrete-calculator?units=metric");
  await page.getByRole("button", { name: "Customize estimate" }).click();

  const results = await scan(page);
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("the 404 page is accessible", async ({ page }) => {
  await page.goto("/no-such-page");

  const results = await scan(page);
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("every interactive control on a planner is reachable by keyboard", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.getByRole("button", { name: "Customize estimate" }).click();

  // A control that cannot be tabbed to cannot be used without a mouse, and axe
  // does not check this — it checks markup, not reachability.
  const unreachable = await page.evaluate(() => {
    const selector = "a[href], button, input, select, textarea, [tabindex]";
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        if (element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true") {
          return false;
        }
        if (element.offsetParent === null) return false; // Not rendered.
        return element.tabIndex < 0;
      })
      .map((element) => element.outerHTML.slice(0, 120));
  });

  expect(unreachable).toEqual([]);
});

test("a visible focus indicator survives keyboard navigation", async ({ page }) => {
  await page.goto("/concrete-calculator");

  for (let step = 0; step < 12; step++) {
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return "none";
      const style = getComputedStyle(element);
      return `${style.outlineStyle}|${style.outlineWidth}|${style.boxShadow}`;
    });
    // Either an outline or a ring; "none|0px|none" means the focus is invisible.
    expect(outline, `after ${step + 1} tabs`).not.toBe("none|0px|none");
  }
});
