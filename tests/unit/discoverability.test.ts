import { describe, expect, it } from "vitest";
import { projects, projectSlugs, relatedProjects } from "@/data/projects";

/**
 * Whether a planner page can be found and understood.
 *
 * Two audiences, one requirement. A crawler needs a path to every planner and
 * a title that matches what someone would type; an answer engine needs the page
 * to state what it calculates without running the client-side planner. Both
 * fail silently — a planner nothing links to simply never appears, and nobody
 * notices, because the page itself is fine.
 */

describe("every planner is reachable", () => {
  it("is linked from at least one other planner", () => {
    // The listing page links to all of them, but a page whose only inbound
    // link is the index is a leaf. Related links are how someone arrives at
    // the deck planner from the concrete one.
    const inbound = new Map(projectSlugs().map((slug) => [slug, 0]));
    for (const slug of projectSlugs()) {
      for (const related of relatedProjects(slug)) {
        inbound.set(related.slug, (inbound.get(related.slug) ?? 0) + 1);
      }
    }

    for (const [slug, count] of inbound) {
      expect(count, `${slug} has no inbound link from another planner`).toBeGreaterThan(0);
    }
  });

  it("links onward rather than dead-ending", () => {
    for (const project of projects) {
      expect(relatedProjects(project.slug).length, project.slug).toBeGreaterThan(0);
    }
  });

  it("never points at itself or at a planner that does not exist", () => {
    const slugs = new Set(projectSlugs());
    for (const project of projects) {
      for (const related of project.related) {
        expect(related, `${project.slug} → ${related}`).not.toBe(project.slug);
        expect(slugs.has(related), `${project.slug} → ${related} does not exist`).toBe(true);
      }
    }
  });
});

describe("every planner is a usable landing page", () => {
  it("has a title that fits a search result", () => {
    // Google truncates around 60 characters. A title cut mid-word is not
    // wrong, but it wastes the one line the page gets.
    for (const project of projects) {
      expect(project.seo.title.length, `${project.slug}: "${project.seo.title}"`).toBeLessThanOrEqual(
        65,
      );
      expect(project.seo.title.length, project.slug).toBeGreaterThan(15);
    }
  });

  it("has a description that says what the page produces", () => {
    for (const project of projects) {
      const description = project.seo.description;
      expect(description.length, `${project.slug}: ${description.length} chars`).toBeGreaterThan(70);
      expect(description.length, `${project.slug}: ${description.length} chars`).toBeLessThanOrEqual(
        165,
      );
    }
  });

  it("has a single h1 that names the calculation", () => {
    for (const project of projects) {
      expect(project.h1, project.slug).toBeTruthy();
      expect(project.h1.length, project.slug).toBeLessThanOrEqual(70);
    }
  });

  it("answers questions rather than restating the title", () => {
    // An FAQ block is the part an answer engine can quote directly. Three is
    // the point below which it is decoration.
    for (const project of projects) {
      expect(project.faq.length, project.slug).toBeGreaterThanOrEqual(3);
      for (const item of project.faq) {
        expect(item.question.endsWith("?"), `${project.slug}: ${item.question}`).toBe(true);
        expect(item.answer.length, `${project.slug}: ${item.question}`).toBeGreaterThan(60);
      }
    }
  });

  it("gives a crawler prose before it gives it a form", () => {
    // The planner is a client component. The intro is the first thing that
    // renders as HTML, so it carries the page's meaning on its own.
    for (const project of projects) {
      expect(project.intro.length, project.slug).toBeGreaterThan(80);
    }
  });

  it("describes each planner distinctly", () => {
    // Ten near-identical descriptions is how a site of calculators gets read
    // as one thin page repeated ten times.
    const descriptions = new Set(projects.map((project) => project.seo.description));
    expect(descriptions.size).toBe(projects.length);

    const titles = new Set(projects.map((project) => project.seo.title));
    expect(titles.size).toBe(projects.length);
  });
});
