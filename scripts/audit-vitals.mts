import { chromium, devices } from "@playwright/test";

/**
 * Core Web Vitals against the production build.
 *
 * The observers are installed via addInitScript so they are running before the
 * first paint — a PerformanceObserver attached after load misses the shifts
 * that matter. Each route is measured on a cold context so nothing is cached.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3210";

const ROUTES = [
  "/",
  "/concrete-calculator",
  "/fence-calculator",
  "/paint-calculator",
  "/deck-calculator",
  "/projects",
  "/my-projects",
  "/plan?q=" + encodeURIComponent("20 by 16 concrete patio 4 inches thick"),
];

const INIT = `
  window.__vitals = { cls: 0, shifts: [], lcp: 0, longTasks: 0 };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__vitals.cls += e.value;
      if (e.value > 0.0005) {
        window.__vitals.shifts.push({
          value: Number(e.value.toFixed(4)),
          at: Math.round(e.startTime),
          nodes: (e.sources || []).map((s) => {
            const n = s.node;
            if (!n || !n.tagName) return "(detached)";
            const cls = typeof n.className === "string" && n.className
              ? "." + n.className.trim().split(/\s+/).slice(0, 3).join(".")
              : "";
            return n.tagName.toLowerCase() + cls;
          }),
        });
      }
    }
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    const es = list.getEntries();
    window.__vitals.lcp = Math.round(es[es.length - 1].startTime);
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__vitals.longTasks += Math.round(e.duration);
  }).observe({ type: "longtask", buffered: true });
`;

type Vitals = { cls: number; lcp: number; longTasks: number; shifts: { value: number; at: number; nodes: string[] }[] };

async function measure(viewport: { width: number; height: number }, label: string) {
  const browser = await chromium.launch();
  console.log(`\n########## ${label} (${viewport.width}x${viewport.height}) ##########`);
  console.log("route".padEnd(46), "CLS".padStart(8), "LCP".padStart(7), "longTask".padStart(9));

  for (const route of ROUTES) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    // Not networkidle: the Vercel insights script 404s outside Vercel and the
    // retry keeps the network busy forever.
    await page.goto(BASE + route, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    // Scroll the whole page: shifts below the fold are still shifts.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);

    const v = (await page.evaluate(() => (window as unknown as { __vitals: Vitals }).__vitals)) as Vitals;
    const flag = v.cls > 0.1 ? "  <-- OVER 0.1" : v.cls > 0.02 ? "  <- watch" : "";
    console.log(
      route.slice(0, 45).padEnd(46),
      v.cls.toFixed(4).padStart(8),
      String(v.lcp).padStart(7),
      String(v.longTasks).padStart(9),
      flag,
    );
    for (const s of v.shifts) {
      console.log(`      shift ${s.value} at ${s.at}ms  ${s.nodes.join(", ")}`);
    }
    await context.close();
  }
  await browser.close();
}

await measure({ width: 1440, height: 900 }, "desktop");
await measure({ width: 1280, height: 1600 }, "desktop tall");
await measure(devices["iPhone 13"].viewport!, "mobile 390");
await measure({ width: 375, height: 667 }, "mobile 375");
