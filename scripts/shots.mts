import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = process.env.OUT ?? "shots/before";
mkdirSync(OUT, { recursive: true });

const PAGES: [string, string][] = [
  ["/", "home"],
  ["/concrete-calculator", "concrete"],
  ["/projects", "projects"],
];
const VIEWPORTS: [number, number, string][] = [
  [1440, 900, "desktop"],
  [390, 844, "mobile"],
];

const browser = await chromium.launch();
for (const [w, h, label] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  for (const [route, name] of PAGES) {
    await page.goto(BASE + route, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: false });
    console.log(`${OUT}/${name}-${label}.png`);
  }
  await ctx.close();
}
await browser.close();
