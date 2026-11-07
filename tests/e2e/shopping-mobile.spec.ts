import { expect, test, type Page } from "@playwright/test";

/**
 * The sticky bar, which is the whole mobile story.
 *
 * On a phone the results column is one long scroll, so the offer that sits
 * under the headline leaves the screen almost immediately. The bar is what
 * keeps the next action a thumb away without pinning a second banner over the
 * content.
 *
 * Every test below drives the bar the way a person does — by pressing its own
 * button — rather than by scrolling programmatically. That is not just realism:
 * `scrollIntoViewIfNeeded` parks an element at whichever edge is closest, which
 * for the headline is the *bottom* of the viewport, outside the band the
 * observer watches. Testing it that way measured the scroll helper rather than
 * the product.
 *
 * Desktop is skipped rather than asserted: the bar is `sm:hidden`, the form and
 * the result sit side by side there, and there is nothing to jump to.
 */

const BAR = "div.fixed.bottom-0";

/** Opens a planner and presses the bar's first action, landing on the result. */
async function seeResult(page: Page, slug: string) {
  await page.goto(`/${slug}`);
  await page.waitForSelector("#result-headline");
  await page.locator(BAR).getByRole("button", { name: /see my result/i }).click();
}

test.describe("the mobile action bar", () => {
  test.skip(
    ({ isMobile }) => !isMobile,
    "the bar is mobile-only; on desktop the layout is two columns",
  );

  test("points at the result first, then at the list, then retires", async ({ page }) => {
    await page.goto("/concrete-calculator");
    await page.waitForSelector("#result-headline");

    const bar = page.locator(BAR);

    // 1. Standing at the form, the next thing is the answer.
    await expect(bar.getByRole("button", { name: /see my result/i })).toBeVisible();

    // 2. At the answer, the next thing is the shopping list.
    await bar.getByRole("button", { name: /see my result/i }).click();
    await expect(bar.getByRole("button", { name: /shop materials/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(bar).toContainText(/7 items ready/i);

    // 3. Standing at the list, the bar has nothing left to say.
    await bar.getByRole("button", { name: /shop materials/i }).click();
    await expect(bar.getByRole("button", { name: /shop materials/i })).toBeHidden({
      timeout: 5_000,
    });
  });

  test("only ever shows one action at a time", async ({ page }) => {
    /*
     * The reason the two bars were merged. Two independently-positioned fixed
     * elements would eventually both render and cover each other; one element
     * that switches its job cannot.
     */
    await page.goto("/concrete-calculator");
    await page.waitForSelector("#result-headline");

    const bar = page.locator(BAR);
    const countVisible = async () => page.locator(`${BAR} button:visible`).count();

    expect(await countVisible(), "at the form").toBeLessThanOrEqual(1);

    await bar.getByRole("button", { name: /see my result/i }).click();
    await page.waitForTimeout(400);
    expect(await countVisible(), "at the result").toBeLessThanOrEqual(1);

    await bar.getByRole("button", { name: /shop materials/i }).click();
    await page.waitForTimeout(400);
    expect(await countVisible(), "at the list").toBeLessThanOrEqual(1);
  });

  test("its button reaches the list", async ({ page }) => {
    await seeResult(page, "concrete-calculator");

    const bar = page.locator(BAR);
    await bar.getByRole("button", { name: /shop materials/i }).click();
    await expect(page.locator("#shopping-list")).toBeInViewport({ timeout: 5_000 });
  });

  test("promises a list rather than shopping when nothing ships", async ({ page }) => {
    // Mulch arrives by the load. The bar must not offer to shop for it.
    await seeResult(page, "mulch-calculator");

    const bar = page.locator(BAR);
    await expect(bar.getByRole("button", { name: /view list/i })).toBeVisible({ timeout: 5_000 });
    await expect(bar.getByRole("button", { name: /shop materials/i })).toHaveCount(0);
    await expect(bar).toContainText(/your list is ready/i);
  });

  test("is inert when hidden, not merely off-screen", async ({ page }) => {
    /*
     * A fixed element translated out of view still sits in the top layer and
     * can intercept taps meant for whatever is at the bottom of the viewport —
     * the kind of intermittent click interception that makes a suite flaky and
     * a product feel broken.
     */
    await seeResult(page, "concrete-calculator");

    const bar = page.locator(BAR);
    await bar.getByRole("button", { name: /shop materials/i }).click();
    await expect(bar).toHaveAttribute("aria-hidden", "true", { timeout: 5_000 });
    await expect(bar).toHaveClass(/pointer-events-none/);
    await expect(bar).toHaveClass(/invisible/);

    // And nothing inside it is reachable by keyboard.
    const tabIndexes = await bar
      .locator("button")
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).tabIndex));
    for (const index of tabIndexes) expect(index).toBe(-1);
  });

  test("never covers the last of the content", async ({ page }) => {
    // The results column reserves the bar's height. Without that the final
    // card sits underneath it and cannot be read or tapped.
    await page.goto("/concrete-calculator");
    await page.waitForSelector("#result-headline");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);

    const last = page.getByRole("button", { name: /does this estimate look wrong/i }).first();
    if ((await last.count()) > 0) await expect(last).toBeInViewport();
  });
});
