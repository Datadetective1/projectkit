import { chromium } from "@playwright/test";
import { projects } from "../src/data/projects";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const browser = await chromium.launch();

for (const width of [1440, 1280, 1024, 768, 390]) {
  console.log(`\n### viewport width ${width}`);
  const context = await browser.newContext({ viewport: { width, height: 1600 } });
  const page = await context.newPage();
  for (const project of projects) {
    await page.goto(`${BASE}/${project.slug}`, { waitUntil: "load" });
    await page.waitForTimeout(900);
    const h = await page.evaluate(() => {
      const grid = document.querySelector("main .grid.grid-cols-1");
      return grid ? Math.round(grid.getBoundingClientRect().height) : -1;
    });
    console.log(`  ${project.slug.padEnd(24)} ${String(h).padStart(6)}px  = ${(h / 16).toFixed(1)}rem`);
  }
  await context.close();
}
await browser.close();
