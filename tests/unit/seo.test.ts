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

  it("recognises the canonical www host as production", async () => {
    /*
     * www is the canonical host. Vercel 308s the apex to it, and Search Console
     * and Bing have both accepted https://www.cubitora.com/sitemap.xml.
     *
     * This test previously asserted the opposite — that www was *not*
     * production — which is exactly the bug it now guards: production would
     * have shipped robots "Disallow: /" and a noindex on every page, quietly
     * removing a site the search engines had already taken.
     */
    const { isProductionSite } = await siteWith({
      NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com",
    });
    expect(isProductionSite).toBe(true);
  });

  it("also treats the apex as production, because the safe failure is inclusive", async () => {
    // The apex only ever redirects, but if a build served it we want an
    // indexable page whose canonical points at www — a duplicate that
    // self-corrects — rather than a deindexed one.
    const { isProductionSite } = await siteWith({
      NEXT_PUBLIC_SITE_URL: "https://cubitora.com",
    });
    expect(isProductionSite).toBe(true);
  });

  it("does not mistake a preview or a local build for production", async () => {
    for (const url of [
      "https://projectkit-git-cubitora-design-x.vercel.app",
      "http://localhost:3000",
      "https://cubitora.com.evil.example",
      "not a url",
    ]) {
      const { isProductionSite } = await siteWith({ NEXT_PUBLIC_SITE_URL: url });
      expect(isProductionSite, url).toBe(false);
    }
  });

  it("emits canonical URLs on the www host", async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com" };
    const { absoluteUrl, pageMetadata } = await import("@/lib/seo");

    expect(absoluteUrl("/concrete-calculator")).toBe(
      "https://www.cubitora.com/concrete-calculator",
    );
    const meta = pageMetadata({ title: "T", description: "D", path: "/concrete-calculator" });
    expect(meta.alternates?.canonical).toBe("https://www.cubitora.com/concrete-calculator");
    expect(meta.openGraph?.url).toBe("https://www.cubitora.com/concrete-calculator");
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
    process.env = { ...ORIGINAL, NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com" };
    const robots = (await import("@/app/robots")).default();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    const wildcard = rules.find((rule) => rule?.userAgent === "*");

    expect(wildcard?.allow).toBe("/");
    for (const path of ["/api/", "/project-pack/", "/my-projects", "/plan"]) {
      expect(wildcard?.disallow, path).toContain(path);
    }
    // The declaration search engines have already accepted.
    expect(robots.sitemap).toBe("https://www.cubitora.com/sitemap.xml");
  });

  it("marks every page noindex off production", async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NEXT_PUBLIC_SITE_URL: "https://preview.vercel.app" };
    const { pageMetadata } = await import("@/lib/seo");

    const meta = pageMetadata({ title: "T", description: "D", path: "/" });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("crawler policy", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  async function productionRobots() {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com" };
    const robots = (await import("@/app/robots")).default();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    return {
      robots,
      for: (agent: string) => rules.find((rule) => rule?.userAgent === agent),
    };
  }

  it("keeps every user-specific route out of every crawler's reach", async () => {
    const { for: ruleFor } = await productionRobots();

    // /plan carries the description someone typed and /project-pack/<id>
    // identifies one person's saved work. Neither is a crawler's business,
    // whichever crawler is asking.
    for (const agent of [
      "*",
      "OAI-SearchBot",
      "Claude-SearchBot",
      "PerplexityBot",
      "Claude-User",
      "Perplexity-User",
    ]) {
      const rule = ruleFor(agent);
      expect(rule, agent).toBeDefined();
      for (const path of ["/api/", "/project-pack/", "/my-projects", "/plan"]) {
        expect(rule?.disallow, `${agent} → ${path}`).toContain(path);
      }
    }
  });

  it("lets search and answer engines reach the public planners", async () => {
    const { for: ruleFor } = await productionRobots();

    for (const agent of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]) {
      expect(ruleFor(agent)?.allow, agent).toBe("/");
    }
  });

  it("declines model-training crawlers, which is the deliberate call", async () => {
    const { for: ruleFor } = await productionRobots();

    for (const agent of ["GPTBot", "ClaudeBot"]) {
      expect(ruleFor(agent)?.disallow, agent).toBe("/");
      expect(ruleFor(agent)?.allow, agent).toBeUndefined();
    }
  });

  it("does not confuse a training crawler with its search sibling", async () => {
    // ClaudeBot trains, Claude-SearchBot surfaces. Blocking the wrong one costs
    // referrals; allowing the wrong one gives away the thing we declined.
    const { for: ruleFor } = await productionRobots();

    expect(ruleFor("ClaudeBot")?.disallow).toBe("/");
    expect(ruleFor("Claude-SearchBot")?.allow).toBe("/");
    expect(ruleFor("GPTBot")?.disallow).toBe("/");
    expect(ruleFor("OAI-SearchBot")?.allow).toBe("/");
  });

  it("declares the sitemap on the canonical www host", async () => {
    const { robots } = await productionRobots();
    expect(robots.sitemap).toBe("https://www.cubitora.com/sitemap.xml");
  });
});

describe("preview deployments cannot claim to be production", () => {
  const BASE = { ...process.env };

  afterEach(() => {
    process.env = { ...BASE };
    vi.resetModules();
  });

  async function site(env: Record<string, string | undefined>) {
    vi.resetModules();
    process.env = { ...BASE, ...env };
    return import("@/config/site");
  }

  it("trusts the deployment over the configured URL", async () => {
    /*
     * The regression this exists for: NEXT_PUBLIC_SITE_URL is set to the
     * canonical www host and applies to every environment unless scoped in
     * Vercel. A preview therefore reads its own site URL as production and, on
     * host alone, served an open robots.txt — a crawlable duplicate of the real
     * site. VERCEL_ENV comes from the deployment, so it cannot be talked out of.
     */
    const preview = await site({
      NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com",
      NEXT_PUBLIC_VERCEL_ENV: "preview",
    });
    expect(preview.isProductionSite).toBe(false);

    const dev = await site({
      NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com",
      NEXT_PUBLIC_VERCEL_ENV: "development",
    });
    expect(dev.isProductionSite).toBe(false);
  });

  it("still recognises the real production deployment", async () => {
    const production = await site({
      NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com",
      NEXT_PUBLIC_VERCEL_ENV: "production",
    });
    expect(production.isProductionSite).toBe(true);
  });

  it("falls back to the host check off Vercel, where VERCEL_ENV does not exist", async () => {
    const selfHosted = await site({
      NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com",
      NEXT_PUBLIC_VERCEL_ENV: undefined,
    });
    expect(selfHosted.isProductionSite).toBe(true);
  });

  it("closes robots on a preview even when the URL says production", async () => {
    vi.resetModules();
    process.env = {
      ...BASE,
      NEXT_PUBLIC_SITE_URL: "https://www.cubitora.com",
      NEXT_PUBLIC_VERCEL_ENV: "preview",
    };
    const robots = (await import("@/app/robots")).default();
    expect(robots.rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    expect(robots.sitemap).toBeUndefined();
  });
});
