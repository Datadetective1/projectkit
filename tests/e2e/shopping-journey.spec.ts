import { expect, test, type Page } from "@playwright/test";

/**
 * The post-calculation journey, as a first-time homeowner meets it.
 *
 * Real users told us they liked the calculators, understood the results, and
 * never realised Cubitora could help them buy anything. The shopping list was
 * the tenth block on the results page, and the only shopping affordance near
 * the top opened a Google search. These tests hold the fix in place:
 *
 *  - the offer is visible without hunting for it
 *  - the button leads to a list that matches what it promised
 *  - the three bulk planners, which genuinely have nothing to buy online, say
 *    so instead of opening an empty sheet
 *
 * Runs in the main suite, whose build has no measurement ID — this is about the
 * interface, not the instrumentation. tests/e2e/analytics-ga4.spec.ts covers
 * the events these interactions emit.
 */

/** Every planner, with what its default project can actually be bought from. */
/*
 * `online` is the materials that ship, `cart` is what one tap adds to an Amazon
 * cart (materials and tools with a product picked), `local` arrives by the load.
 */
const PLANNERS = [
  { slug: "concrete-calculator", online: 2, cart: 7, local: 3 },
  { slug: "fence-calculator", online: 6, cart: 5, local: 0 },
  { slug: "paint-calculator", online: 3, cart: 7, local: 0 },
  { slug: "flooring-calculator", online: 2, cart: 2, local: 1 },
  { slug: "mulch-calculator", online: 0, cart: 1, local: 1 },
  { slug: "gravel-calculator", online: 0, cart: 2, local: 1 },
  { slug: "drywall-calculator", online: 4, cart: 7, local: 0 },
  { slug: "tile-calculator", online: 4, cart: 5, local: 0 },
  { slug: "deck-calculator", online: 2, cart: 4, local: 5 },
  { slug: "sod-calculator", online: 0, cart: 3, local: 1 },
] as const;

async function openPlanner(page: Page, slug: string) {
  await page.goto(`/${slug}`);
  await page.waitForSelector("#result-headline");
}

/* ------------------------------------------------------------ discovery -- */

test("the offer sits with the answer, not three screens below it", async ({ page }) => {
  /*
   * The regression this whole redesign exists to prevent. Measured in pixels
   * from the top of the document rather than by eye: the card has to be within
   * roughly one screen of the headline, or it is buried again.
   */
  await openPlanner(page, "concrete-calculator");

  const headline = page.locator("#result-headline");
  const card = page.getByRole("region", { name: /here.s what you need/i });
  await expect(card).toBeVisible();

  const headlineBox = await headline.boundingBox();
  const cardBox = await card.boundingBox();
  expect(headlineBox, "no headline").not.toBeNull();
  expect(cardBox, "no next-step card").not.toBeNull();

  // Directly beneath, not merely somewhere after.
  expect(cardBox!.y).toBeGreaterThan(headlineBox!.y);
  expect(cardBox!.y - (headlineBox!.y + headlineBox!.height)).toBeLessThan(200);
});

test("the shopping list comes before the explanations, not after them", async ({ page }) => {
  await openPlanner(page, "concrete-calculator");

  const list = await page.locator("#shopping-list").boundingBox();
  const explanation = await page.locator("#result-meaning").boundingBox();
  const headline = await page.locator("#result-headline").boundingBox();

  expect(list, "no shopping list").not.toBeNull();
  expect(headline!.y, "the answer should precede the list").toBeLessThan(list!.y);
  expect(explanation!.y, "the explanation should follow the list").toBeGreaterThan(list!.y);
});

test("materials are stated once, not twice", async ({ page }) => {
  /*
   * The redundancy this pass exists to remove. Every material used to appear in
   * a "Materials" table and again in the shopping list, with the same name and
   * the same formatted quantity, five sections apart. Counting occurrences of a
   * material name is the direct test of that: one row, one place.
   */
  await openPlanner(page, "concrete-calculator");

  for (const material of ["Ready-mix concrete (delivered)", "Compactable base gravel"]) {
    await expect(
      page.getByText(material, { exact: true }),
      `${material} appears more than once`,
    ).toHaveCount(1);
  }

  // And the cost now sits with the material rather than in a table of its own.
  const list = page.locator("#shopping-list");
  await expect(list.getByText("$743", { exact: false }).first()).toBeVisible();
});

test("the card's list button reaches the list", async ({ page }) => {
  await openPlanner(page, "concrete-calculator");

  await page.getByRole("button", { name: /view shopping list/i }).click();

  const list = page.locator("#shopping-list");
  await expect(list).toBeInViewport({ timeout: 5_000 });
  /*
   * Focus follows the scroll, so the keyboard lands where the eye does. The
   * target is the wrapper rather than the section itself: `tabindex="-1"` on a
   * container is the documented way to make a region focusable by script
   * without adding a tab stop.
   */
  await expect(page.locator('div[tabindex="-1"]').filter({ has: list })).toBeFocused();
});

test("the secondary action reaches the deeper plan", async ({ page }) => {
  await openPlanner(page, "concrete-calculator");

  await page.getByRole("button", { name: /view full project plan/i }).click();
  /*
   * Lands on the Project Pack card, which is what the label names.
   *
   * It briefly landed at the top of the deeper block instead, which opens with
   * the what-if sliders — decision support genuinely does come before
   * take-it-with-you, but that is an argument about section order, not a licence
   * for the call to action to point somewhere other than where it says.
   */
  await expect(page.getByRole("heading", { name: /take the whole plan with you/i })).toBeInViewport(
    { timeout: 5_000 },
  );
  await expect(page.getByRole("button", { name: "Preview Project Pack" })).toBeInViewport();
});

/* -------------------------------------------------- the count is honest -- */

for (const planner of PLANNERS) {
  test(`${planner.slug}: the card's count matches the list`, async ({ page }) => {
    await openPlanner(page, planner.slug);

    const card = page.getByRole("region", { name: /here.s what you need/i });
    await expect(card).toBeVisible();

    const list = page.locator("#shopping-list");
    /*
     * Scoped to the materials. Tools carry links of their own now, but they
     * are not part of the estimate and never part of the count.
     */
    const buyButtons = list
      .locator('[data-group="online"]')
      .getByRole("link", { name: /shop on amazon/i });

    /*
     * The number on the card, the button under it and the button on the list
     * are three surfaces reading one rule. The card used to count two
     * materials above a button adding seven items, which is the kind of small
     * contradiction that costs more trust than the feature earns.
     */
    await expect(card).toContainText(new RegExp(`${planner.cart}\\s+items?`));
    await expect(card.getByTestId("amazon-cart")).toContainText(`Add ${planner.cart} item`);
    await expect(list.getByTestId("amazon-cart")).toContainText(`Add ${planner.cart} item`);
    await expect(card.getByRole("button", { name: /view shopping list/i })).toBeVisible();
    await expect(buyButtons).toHaveCount(planner.online);
    if (planner.online > 0) {
      await expect(list.getByText(/materials that ship to you/i)).toBeVisible();
    }

    if (planner.local > 0) {
      await expect(list.getByText(/order from a local supplier/i)).toBeVisible();
    }
  });
}

/* ---------------------------------------------------------- compliance -- */

test("the disclosure sits above the first paid link, once", async ({ page }) => {
  await openPlanner(page, "drywall-calculator");

  const list = page.locator("#shopping-list");
  await list.scrollIntoViewIfNeeded();

  const disclosure = list.getByText(/As an Amazon Associate, Cubitora earns/i);
  await expect(disclosure).toHaveCount(1);

  const firstLink = list.getByRole("link", { name: /shop on amazon/i }).first();
  const disclosureBox = await disclosure.boundingBox();
  const linkBox = await firstLink.boundingBox();
  expect(disclosureBox!.y, "the disclosure must precede the first paid link").toBeLessThan(
    linkBox!.y,
  );

  // Every link carries its own marker as well, per the FTC's "clear and
  // conspicuous at the link itself".
  const links = await list.getByRole("link", { name: /shop on amazon/i }).all();
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    await expect(link).toHaveAttribute("rel", /sponsored/);
    await expect(link).toHaveAttribute("href", /tag=cubitora86-20/);
    await expect(link).toHaveAttribute("target", "_blank");
  }
  // One marker per link, plus the one beside the add-to-cart button.
  await expect(list.getByText("Paid link")).toHaveCount(links.length + 1);
});

test("one tap sends the list to an Amazon cart, with the tag", async ({ page }) => {
  await openPlanner(page, "concrete-calculator");

  const list = page.locator("#shopping-list");
  await list.scrollIntoViewIfNeeded();

  const cart = list.getByTestId("amazon-cart");
  await expect(cart).toBeVisible();
  await expect(cart).toHaveAttribute("rel", /sponsored/);
  await expect(cart).toHaveAttribute("target", "_blank");

  const before = new URL((await cart.getAttribute("href"))!);
  expect(before.origin + before.pathname).toBe("https://www.amazon.com/gp/aws/cart/add.html");
  expect(before.searchParams.get("AssociateTag")).toBe("cubitora86-20");
  const count = Number((await cart.textContent())!.match(/Add (\d+) item/)![1]);
  expect(before.searchParams.has(`ASIN.${count}`)).toBe(true);
  expect(before.searchParams.has(`ASIN.${count + 1}`)).toBe(false);

  // The disclosure comes first, so it is read before the button.
  const disclosure = list.getByText(/As an Amazon Associate, Cubitora earns/i);
  expect((await disclosure.boundingBox())!.y).toBeLessThan((await cart.boundingBox())!.y);

  // Ticking something off takes it out of the cart.
  await list.getByRole("checkbox", { name: /bull float or magnesium float/i }).check();
  await expect(cart).toContainText(`Add ${count - 1} item`);
  const after = new URL((await cart.getAttribute("href"))!);
  expect(after.searchParams.has(`ASIN.${count}`)).toBe(false);
});

test("tools link to Amazon, with the disclosure above them", async ({ page }) => {
  /*
   * Mulch has no parcel-sized materials, so the tools list is where its first
   * paid link sits. The disclosure has to move with it rather than vanish
   * along with the materials group.
   */
  await openPlanner(page, "mulch-calculator");

  const list = page.locator("#shopping-list");
  await list.scrollIntoViewIfNeeded();

  const tools = list.locator('[data-group="supplies"]');
  const links = tools.getByRole("link", { name: /shop on amazon/i });
  expect(await links.count()).toBeGreaterThan(0);

  const disclosure = list.getByText(/As an Amazon Associate, Cubitora earns/i);
  await expect(disclosure).toHaveCount(1);
  const disclosureBox = await disclosure.boundingBox();
  const linkBox = await links.first().boundingBox();
  expect(disclosureBox!.y).toBeLessThan(linkBox!.y);

  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("rel", /sponsored/);
    await expect(link).toHaveAttribute("href", /tag=cubitora86-20/);
  }
});

test("no shopping link ever reaches a local-supplier line", async ({ page }) => {
  // The exclusions are the reason the whole surface stays credible.
  await openPlanner(page, "concrete-calculator");

  const local = page
    .locator("#shopping-list li")
    .filter({ hasText: /ready-mix|base gravel|form board/i });
  const count = await local.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await expect(local.nth(index).getByRole("link", { name: /shop on amazon/i })).toHaveCount(0);
  }
});

test("the retired Google button is gone", async ({ page }) => {
  /*
   * It sat under the materials table wearing rel="sponsored" and opened a plain
   * web search. It was the only shopping affordance a user could find near the
   * top of the page, and it led off the site — the likeliest single reason
   * people reported that Cubitora did not help them buy anything.
   */
  await openPlanner(page, "concrete-calculator");
  await expect(page.getByRole("link", { name: /^shop materials/i })).toHaveCount(0);
  await expect(page.locator('a[href*="google.com/search"]')).toHaveCount(0);
});

/* ----------------------------------------------------- nothing regressed -- */

test("ticking an item still works, and still persists", async ({ page }) => {
  // The ids behind `checked` are what saved projects store. A regrouping that
  // renamed them would silently wipe every tick a returning user had.
  await openPlanner(page, "concrete-calculator");

  const list = page.locator("#shopping-list");
  await list.scrollIntoViewIfNeeded();
  await expect(list.getByText(/0 of \d+ ticked off/)).toBeVisible();

  await list.getByRole("checkbox").first().check();
  await expect(list.getByText(/1 of \d+ ticked off/)).toBeVisible();

  await page.getByRole("button", { name: /^save/i }).first().click();
  await page.reload();
  await page.waitForSelector("#result-headline");
});

test("tapping a buy button does not tick its checkbox", async ({ page }) => {
  /*
   * The failure mode of putting a button inside a <label>: activating the label
   * activates its control, so the buy button would tick the box as well as
   * follow its link. The markup keeps the button outside the label.
   */
  await openPlanner(page, "drywall-calculator");

  const list = page.locator("#shopping-list");
  await list.scrollIntoViewIfNeeded();
  await expect(list.getByText(/0 of \d+ ticked off/)).toBeVisible();

  const link = list.getByRole("link", { name: /shop on amazon/i }).first();
  /*
   * Centre the button before tapping it.
   *
   * `scrollIntoViewIfNeeded` parks an element at the nearest edge, which for the
   * first row of the list is the very top of the viewport — underneath the 64px
   * sticky header, which then intercepts the tap. Playwright retries until the
   * test budget runs out, which is what made this fail two runs in three.
   *
   * Nothing about the product is wrong: the shopping section carries
   * `scroll-mt-24`, and the "Shop these materials" button scrolls with
   * `block: "start"` so the header is accounted for. It is only this test's raw
   * scroll that lands under it.
   */
  await link.evaluate((node) => node.scrollIntoView({ block: "center" }));
  await expect(link).toBeInViewport();
  await link.evaluate((node) =>
    node.addEventListener("click", (event) => event.preventDefault(), true),
  );
  await link.click();

  await expect(list.getByText(/0 of \d+ ticked off/)).toBeVisible();
});
