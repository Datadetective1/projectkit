import { afterEach, describe, expect, it, vi } from "vitest";
import { projects } from "@/data/projects";
import { site } from "@/config/site";

/**
 * Search results truncate a title near 60 characters and a description near
 * 160. Neither limit is enforced anywhere at build time, so a title written to
 * read well in an editor quietly loses its tail in the only place it matters.
 *
 * The suffix the layout appends counts against the budget, which is the part
 * that is easy to forget — five planner titles were over only once
 * " | ProjectKit" was added.
 */

const SUFFIX = ` | ${site.name}`;
const TITLE_LIMIT = 60;

describe("planner search metadata", () => {
  for (const project of projects) {
    describe(project.slug, () => {
      it("has a title that survives truncation, suffix included", () => {
        const rendered = project.seo.title + SUFFIX;
        expect(rendered.length, `"${rendered}"`).toBeLessThanOrEqual(TITLE_LIMIT);
      });

      it("has a description in the range a result actually shows", () => {
        expect(project.seo.description.length, project.seo.description).toBeGreaterThanOrEqual(70);
        expect(project.seo.description.length, project.seo.description).toBeLessThanOrEqual(160);
      });

      it("leads with the project name, which is what people search for", () => {
        expect(project.seo.title.toLowerCase()).toMatch(
          new RegExp(`^${project.name.toLowerCase()}`),
        );
        expect(project.seo.title.toLowerCase()).toContain("calculator");
      });

      it("has a breadcrumb and enough FAQ entries to be worth marking up", () => {
        expect(project.seo.breadcrumb).toBeTruthy();
        expect(project.faq.length).toBeGreaterThanOrEqual(2);
        for (const entry of project.faq) {
          expect(entry.question.length).toBeGreaterThan(10);
          expect(entry.answer.length).toBeGreaterThan(40);
        }
      });
    });
  }

  it("gives every planner a distinct title and description", () => {
    const titles = projects.map((project) => project.seo.title);
    const descriptions = projects.map((project) => project.seo.description);

    expect(new Set(titles).size, "duplicate titles").toBe(titles.length);
    expect(new Set(descriptions).size, "duplicate descriptions").toBe(descriptions.length);
  });

  it("cross-links every planner to related ones", () => {
    const slugs = new Set(projects.map((project) => project.slug));
    for (const project of projects) {
      expect(project.related.length, project.slug).toBeGreaterThanOrEqual(2);
      for (const related of project.related) {
        expect(slugs.has(related), `${project.slug} → ${related}`).toBe(true);
        expect(related, `${project.slug} links to itself`).not.toBe(project.slug);
      }
    }
  });
});

describe("deployment indexability", () => {
  /**
   * A preview deployment is a byte-identical copy of the site on a different
   * host. Left crawlable it splits the real site's ranking between two URLs,
   * and this very nearly shipped: NEXT_PUBLIC_SITE_URL applies to every
   * environment unless it is scoped in Vercel, so the design preview
   * canonicalised to production while serving "Allow: /".
   */

  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
    vi.resetModules();
  });

  async function siteWith(env: Record<string, string | undefined>) {
    vi.resetModules();
    process.env = { ...ORIGINAL, ...env };
    return import("@/config/site");
  }

  it("recognises the real domain as production", async () => {
    const { isProductionSite } = await siteWith({
      NEXT_PUBLIC_SITE_URL: "https://cubitora.com",
    });
    expect(isProductionSite).toBe(true);
  });

  it("does not mistake a preview for production", async () => {
    for (const url of [
      "https://projectkit-git-cubitora-design-x.vercel.app",
      "http://localhost:3000",
      // The www host is a redirect source, not the canonical.
      "https://www.cubitora.com",
    ]) {
      const { isProductionSite } = await siteWith({ NEXT_PUBLIC_SITE_URL: url });
      expect(isProductionSite, url).toBe(false);
    }
  });

  it("closes robots.txt entirely off production", async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NEXT_PUBLIC_SITE_URL: "https://preview.vercel.app" };
    const robots = (await import("@/app/robots")).default();

    expect(robots.rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    expect(robots.sitemap).toBeUndefined();
  });

  it("opens robots.txt on production, minus the private routes", async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NEXT_PUBLIC_SITE_URL: "https://cubitora.com" };
    const robots = (await import("@/app/robots")).default();
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;

    expect(rule?.allow).toBe("/");
    expect(rule?.disallow).toContain("/api/");
    expect(rule?.disallow).toContain("/my-projects");
    expect(robots.sitemap).toBe("https://cubitora.com/sitemap.xml");
  });

  it("marks every page noindex off production", async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NEXT_PUBLIC_SITE_URL: "https://preview.vercel.app" };
    const { pageMetadata } = await import("@/lib/seo");

    const meta = pageMetadata({ title: "T", description: "D", path: "/" });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});
