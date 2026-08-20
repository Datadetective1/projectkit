import { describe, expect, it } from "vitest";
import { answerPages, answerPaths, answersFor, getAnswer } from "@/data/answers";
import { getProject } from "@/data/projects";
import { compute, threeNumbers } from "@/lib/answers/compute";
import { defaultValues, evaluate } from "@/lib/calc/engine";

/**
 * Answer pages.
 *
 * The whole premise is that these pages carry the planner's numbers rather than
 * a copy of them. So the tests that matter are not "does the page render" but
 * "does it still agree with the engine" — because the failure mode here is
 * silent: a waste default changes, the planner updates, and twenty published
 * pages quietly start advertising figures the product no longer produces.
 */

describe("every answer page is wired to something real", () => {
  it("belongs to a planner that exists", () => {
    for (const page of answerPages) {
      expect(getProject(page.planner), `${page.slug} → ${page.planner}`).toBeDefined();
    }
  });

  it("computes without falling over", () => {
    for (const page of answerPages) {
      expect(compute(page.planner, page.values), page.slug).not.toBeNull();
    }
  });

  it("has a unique path", () => {
    const paths = answerPaths();
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("is reachable from its planner", () => {
    // The hub module is what stops these being orphans; if a planner reports no
    // answers, its pages have one inbound link each and that is the sitemap.
    for (const page of answerPages) {
      expect(answersFor(page.planner).map((entry) => entry.slug)).toContain(page.slug);
    }
  });

  it("is retrievable by planner and slug", () => {
    for (const page of answerPages) {
      expect(getAnswer(page.planner, page.slug)?.h1).toBe(page.h1);
    }
    expect(getAnswer("concrete-calculator", "not-a-page")).toBeUndefined();
  });
});

describe("the numbers agree with the planner", () => {
  it("matches the engine run at the same inputs, planner-side", () => {
    /*
     * The regression this exists for. An answer page and its planner must be
     * two views of one calculation, never two calculations that happen to
     * agree today.
     */
    for (const page of answerPages) {
      const project = getProject(page.planner)!;
      const direct = evaluate(project, { ...defaultValues(project, "us"), ...page.values }, "us");
      const viaAnswer = compute(page.planner, page.values);

      expect(direct.ok, page.slug).toBe(true);
      if (!direct.ok || !viaAnswer) continue;

      expect(viaAnswer.result.headline.value, page.slug).toBe(direct.result.headline.value);
      expect(viaAnswer.result.costTotal, page.slug).toBe(direct.result.costTotal);
    }
  });

  it("gives a size page three genuinely different figures", () => {
    // One number is what every competing page publishes, and it is why people
    // under-order. The gap between calculated and purchase is the whole point.
    const slab = compute("concrete-calculator", { length: 10, width: 10, thickness: 4 })!;
    const numbers = threeNumbers(slab);

    expect(numbers.calculated).toBeTruthy();
    expect(numbers.purchase).toBeTruthy();
    expect(numbers.calculated).not.toBe(numbers.withWaste);
    expect(numbers.withWaste).not.toBe(numbers.purchase);
  });

  it("carries no hardcoded quantity in any definition", () => {
    /*
     * A definition may write the question and the framing. It may not write an
     * answer — the moment a number is typed into this file it can drift from
     * the engine, which is exactly what these pages exist not to do.
     *
     * Dimensions in a title ("10x10", "1,000 square feet") are the question, so
     * only prose fields are checked, and only for units.
     */
    const UNIT = /\b\d[\d,.]*\s?(yd³|cu ft|cubic yards?|sq ft|bags|rolls|pallets|gal|\$)/i;
    for (const page of answerPages) {
      expect(page.intro, `${page.slug} intro`).not.toMatch(UNIT);
      for (const link of page.related) {
        expect(link.note, `${page.slug} → ${link.href}`).not.toMatch(UNIT);
      }
    }
  });
});

describe("what the pages promise", () => {
  it("has a title that fits a search result and a description that fits a snippet", () => {
    for (const page of answerPages) {
      // The site name is appended by pageMetadata, so budget for it.
      expect(page.seo.title.length, `${page.slug}: "${page.seo.title}"`).toBeLessThanOrEqual(52);
      expect(page.seo.description.length, page.slug).toBeGreaterThan(70);
      expect(page.seo.description.length, page.slug).toBeLessThanOrEqual(160);
    }
  });

  it("asks a real question in the heading", () => {
    for (const page of answerPages) {
      expect(page.h1.length, page.slug).toBeGreaterThan(20);
    }
  });

  it("keeps every FAQ answer substantial, or has no FAQ at all", () => {
    // A padded FAQ is the tell of an automated page. Better to omit it.
    for (const page of answerPages) {
      for (const item of page.faq) {
        expect(item.question.endsWith("?"), `${page.slug}: ${item.question}`).toBe(true);
        expect(item.answer.length, `${page.slug}: ${item.question}`).toBeGreaterThan(90);
      }
    }
  });

  it("describes each page distinctly", () => {
    // Five near-identical pages is the thin-content trap this pattern has to
    // avoid to be worth scaling.
    expect(new Set(answerPages.map((page) => page.seo.title)).size).toBe(answerPages.length);
    expect(new Set(answerPages.map((page) => page.seo.description)).size).toBe(answerPages.length);
    expect(new Set(answerPages.map((page) => page.h1)).size).toBe(answerPages.length);
    expect(new Set(answerPages.map((page) => page.intro)).size).toBe(answerPages.length);
  });

  it("never links to a private or off-site URL", () => {
    for (const page of answerPages) {
      for (const link of page.related) {
        expect(link.href.startsWith("/"), `${page.slug} → ${link.href}`).toBe(true);
        for (const prefix of ["/api/", "/project-pack/", "/my-projects", "/plan"]) {
          expect(link.href.startsWith(prefix), `${page.slug} → ${link.href}`).toBe(false);
        }
      }
    }
  });

  it("prefills the planner with the inputs the page discusses", () => {
    // If the hand-off does not carry the numbers, the page has sent someone to
    // a blank form and wasted the visit.
    for (const page of answerPages) {
      expect(Object.keys(page.prefill).length, page.slug).toBeGreaterThan(0);
      for (const [key, value] of Object.entries(page.prefill)) {
        expect(page.values[key], `${page.slug}.${key}`).toBe(value);
      }
    }
  });
});
