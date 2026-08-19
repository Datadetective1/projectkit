import { describe, expect, it } from "vitest";
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
