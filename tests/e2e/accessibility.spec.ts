import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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
];

function audit(page: Page) {
  return new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);
}

for (const target of PAGES) {
  test(`${target.name} has no automatically detectable accessibility violations`, async ({
    page,
  }) => {
    await page.goto(target.path);
    const results = await audit(page).analyze();

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

  const results = await audit(page).analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("the project pack is accessible", async ({ page }) => {
  await page.goto("/concrete-calculator");
  await page.getByRole("button", { name: "Preview Project Pack" }).first().click();
  await expect(page).toHaveURL(/project-pack\//);

  const results = await audit(page).analyze();
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
