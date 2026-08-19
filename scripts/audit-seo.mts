import { chromium } from "@playwright/test";
import { projects } from "../src/data/projects";

/**
 * Technical SEO across every indexable route.
 *
 * The extraction runs as a source string rather than a function: tsx compiles
 * named inner functions with an esbuild `__name` helper that does not exist in
 * the page, so a normal arrow function throws a ReferenceError at runtime.
 */

interface Meta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogTitle: string;
  ogImage: string;
  twitterCard: string;
  h1s: string[];
  schemaTypes: string[];
  internalLinks: number;
}

const EXTRACT = `(() => {
  var get = function (sel, attr) {
    var el = document.querySelector(sel);
    return el ? (el.getAttribute(attr || "content") || "") : "";
  };
  var ld = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
    try { ld.push(JSON.parse(s.textContent || "{}")); } catch (e) { ld.push({}); }
  });
  // A block can be a single node, an @graph, or a plain array of nodes.
  var types = [];
  var visit = function (node) {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (Array.isArray(node["@graph"])) { node["@graph"].forEach(visit); return; }
    if (node["@type"]) types.push(node["@type"]);
  };
  ld.forEach(visit);
  var h1s = [];
  document.querySelectorAll("h1").forEach(function (h) { h1s.push((h.textContent || "").trim()); });
  return {
    title: document.title,
    description: get('meta[name="description"]'),
    canonical: get('link[rel="canonical"]', "href"),
    robots: get('meta[name="robots"]'),
    ogTitle: get('meta[property="og:title"]'),
    ogImage: get('meta[property="og:image"]'),
    twitterCard: get('meta[name="twitter:card"]'),
    h1s: h1s,
    schemaTypes: types,
    internalLinks: document.querySelectorAll("a[href^='/']").length
  };
})()`;

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const ROUTES = [
  "/",
  "/projects",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/my-projects",
  ...projects.map((project) => `/${project.slug}`),
];

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

const problems: string[] = [];
const titles = new Map<string, string>();
const descriptions = new Map<string, string>();

for (const route of ROUTES) {
  const response = await page.goto(BASE + route, { waitUntil: "load" });
  const status = response?.status() ?? 0;
  const meta = (await page.evaluate(EXTRACT)) as Meta;

  const flag = (message: string) => problems.push(`${route}: ${message}`);

  if (status !== 200) flag(`HTTP ${status}`);
  if (!meta.title) flag("no <title>");
  else if (meta.title.length > 60) flag(`title ${meta.title.length} chars, truncates in results: "${meta.title}"`);
  if (!meta.description) flag("no meta description");
  else if (meta.description.length < 70 || meta.description.length > 160) {
    flag(`description ${meta.description.length} chars (want 70-160)`);
  }
  if (!meta.canonical) flag("no canonical");
  if (meta.h1s.length !== 1) flag(`${meta.h1s.length} <h1> elements`);
  if (!meta.ogTitle) flag("no og:title");
  if (!meta.ogImage) flag("no og:image");
  if (!meta.twitterCard) flag("no twitter:card");
  if (meta.internalLinks < 5) flag(`only ${meta.internalLinks} internal links`);

  if (titles.has(meta.title)) flag(`duplicate title with ${titles.get(meta.title)}`);
  titles.set(meta.title, route);
  if (descriptions.has(meta.description)) {
    flag(`duplicate description with ${descriptions.get(meta.description)}`);
  }
  descriptions.set(meta.description, route);

  console.log(
    `${route.padEnd(26)} title ${String(meta.title.length).padStart(3)}  desc ${String(meta.description.length).padStart(3)}  h1:${meta.h1s.length}  links:${String(meta.internalLinks).padStart(3)}  [${meta.schemaTypes.join(", ")}]`,
  );
}

console.log(
  "\n" + (problems.length ? `PROBLEMS (${problems.length}):\n  ` + problems.join("\n  ") : "No SEO problems found."),
);
await browser.close();
