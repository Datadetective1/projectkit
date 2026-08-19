import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { projects } from "../src/data/projects";

/**
 * Drives a real save -> Project Pack for every project and screenshots the
 * result, so the pack can be looked at rather than assumed correct.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = process.env.OUT_DIR ?? "audit-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function packFor(slug: string, viewport: { width: number; height: number }, label: string, units: "us" | "metric") {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const problems: string[] = [];

  await page.goto(`${BASE}/${slug}${units === "metric" ? "?units=metric" : ""}`, { waitUntil: "load" });
  await page.waitForTimeout(700);

  // Longest plausible note, to test wrapping and pagination.
  const notes = page.getByLabel(/note/i).first();
  if (await notes.count()) {
    await notes.fill(
      "Supplier is Hartley & Sons on Old Mill Road, delivery booked for the Saturday morning — ask for the driver to reverse up the side gate rather than the drive, the drive will not take a loaded truck. Colour to match the existing back wall.",
    );
  }

  const preview = page.getByRole("button", { name: "Preview Project Pack" }).first();
  if (!(await preview.count())) {
    problems.push("no Preview Project Pack button");
    await context.close();
    return problems;
  }
  await preview.click();
  await page.waitForURL(/project-pack/, { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Horizontal overflow is the classic mobile-pack failure.
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  if (overflow.scrollW > overflow.clientW + 1) {
    problems.push(`horizontal overflow: ${overflow.scrollW} > ${overflow.clientW}`);
  }

  const body = await page.evaluate(() => document.body.innerText);
  for (const bad of ["NaN", "Infinity", "undefined", "[object Object]"]) {
    if (body.includes(bad)) problems.push(`renders "${bad}"`);
  }
  if (/\b1 (bags|rolls|boxes|sheets|pallets|sets|tiles|posts)\b/.test(body)) {
    problems.push("plural unit at a quantity of one");
  }

  await page.screenshot({ path: `${OUT}/${slug}-${label}-${units}.png`, fullPage: true });
  await context.close();
  return problems;
}

let anyProblem = false;
for (const project of projects) {
  const desktop = await packFor(project.slug, { width: 1440, height: 900 }, "desktop", "us");
  const mobile = await packFor(project.slug, devices["iPhone 13"].viewport!, "mobile", "us");
  const metric = await packFor(project.slug, { width: 1440, height: 900 }, "desktop", "metric");
  const all = [
    ...desktop.map((p) => `desktop: ${p}`),
    ...mobile.map((p) => `mobile: ${p}`),
    ...metric.map((p) => `metric: ${p}`),
  ];
  if (all.length) {
    anyProblem = true;
    console.log(`\n${project.slug}`);
    for (const p of all) console.log(`   ! ${p}`);
  } else {
    console.log(`ok  ${project.slug}`);
  }
}

await browser.close();
console.log(anyProblem ? "\nProblems found — see above." : "\nNo problems found.");
