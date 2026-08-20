import { expect, test } from "@playwright/test";
import { projects } from "../../src/data/projects";
import { answerPaths } from "../../src/data/answers";

/**
 * Cumulative Layout Shift, guarded rather than measured once.
 *
 * Two shifts got past a manual check because it only ever ran at one viewport
 * height: the planner skeleton reserved a fixed 44rem, which stops being
 * "below the fold" on a tall window, and /my-projects reserved a card shorter
 * than the state it resolves to. Both scored zero at 900px and over 0.1 at
 * 1600px.
 *
 * So the tall viewport is the one that runs here. Anything that reserves space
 * by guessing at a viewport will fail this, which is the point.
 */

const TALL = { width: 1280, height: 1600 };

/** Google's "good" threshold. Nothing here should come close to it. */
const CLS_BUDGET = 0.1;

const OBSERVER = `
  window.__cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__cls += entry.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
`;

async function measureCls(page: import("@playwright/test").Page, path: string) {
  await page.addInitScript(OBSERVER);
  await page.setViewportSize(TALL);
  await page.goto(path);
  await page.waitForLoadState("load");
  // Give hydration time to land, then scroll: a shift below the fold is still
  // a shift once the user gets there.
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

test.describe("layout stability", () => {
  for (const project of projects) {
    test(`${project.slug} settles without shifting`, async ({ page }) => {
      const cls = await measureCls(page, `/${project.slug}`);
      expect(cls, `${project.slug} CLS`).toBeLessThan(CLS_BUDGET);
    });
  }

  for (const path of ["/", "/projects", "/my-projects", "/about", ...answerPaths()]) {
    test(`${path} settles without shifting`, async ({ page }) => {
      const cls = await measureCls(page, path);
      expect(cls, `${path} CLS`).toBeLessThan(CLS_BUDGET);
    });
  }

  test("a prefilled planner settles without shifting", async ({ page }) => {
    const cls = await measureCls(
      page,
      "/plan?q=" + encodeURIComponent("20 by 16 concrete patio 4 inches thick"),
    );
    expect(cls).toBeLessThan(CLS_BUDGET);
  });
});
