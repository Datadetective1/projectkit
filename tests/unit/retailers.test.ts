import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projects } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import { buildShoppingList } from "@/components/results/ShoppingList";

/**
 * The retailer layer.
 *
 * Two things are being protected here, and only one of them is a feature.
 *
 * The feature: a material can carry a destination, so "add retailer links"
 * later is a configuration change rather than a refactor of every calculation.
 *
 * The other thing is a promise. Cubitora has no retailer relationships, and a
 * link that implies one — or an affiliate tag committed to a public repository
 * — would be a lie told at exactly the moment someone is deciding whether to
 * trust the numbers. These tests assert that nothing ships enabled and nothing
 * ships with an ID in it.
 */

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

async function retailersWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...ORIGINAL, ...env };
  return import("@/config/retailers");
}

describe("nothing is enabled by default", () => {
  it("configures no retailers when the environment is empty", async () => {
    const { retailers, whereToBuyEnabled } = await retailersWith({});
    expect(retailers).toEqual([]);
    expect(whereToBuyEnabled).toBe(false);
  });

  it("stays off when the flag is on but nothing is configured", async () => {
    // An empty panel promising retailers is worse than no panel.
    const { whereToBuyEnabled } = await retailersWith({
      NEXT_PUBLIC_WHERE_TO_BUY_ENABLED: "true",
    });
    expect(whereToBuyEnabled).toBe(false);
  });

  it("stays off when a retailer exists but the flag does not", async () => {
    const { retailers, whereToBuyEnabled } = await retailersWith({
      NEXT_PUBLIC_RETAILER_AMAZON_URL: "https://example.test/s?k={query}",
    });
    expect(retailers).toHaveLength(1);
    expect(whereToBuyEnabled).toBe(false);
  });

  it("turns on only when both are true", async () => {
    const { whereToBuyEnabled } = await retailersWith({
      NEXT_PUBLIC_WHERE_TO_BUY_ENABLED: "true",
      NEXT_PUBLIC_RETAILER_AMAZON_URL: "https://example.test/s?k={query}",
    });
    expect(whereToBuyEnabled).toBe(true);
  });

  it("ignores a URL with no {query} placeholder", async () => {
    // Without the placeholder every material would link to the same page,
    // which is a worse outcome than no link.
    const { retailers } = await retailersWith({
      NEXT_PUBLIC_RETAILER_LOWES_URL: "https://example.test/search",
    });
    expect(retailers).toEqual([]);
  });
});

describe("the honesty of an outbound link", () => {
  it("marks a link sponsored only when it genuinely is", async () => {
    const { retailerRel } = await retailersWith({
      NEXT_PUBLIC_RETAILER_AMAZON_URL: "https://example.test/s?k={query}",
    });

    expect(retailerRel({ id: "amazon", name: "A", searchUrlTemplate: "x", affiliate: true })).toContain(
      "sponsored",
    );
    // Marking a non-commercial link as sponsored is a lie in the other
    // direction, and it also tells Google something untrue.
    expect(
      retailerRel({ id: "amazon", name: "A", searchUrlTemplate: "x", affiliate: false }),
    ).not.toContain("sponsored");
  });

  it("defaults a configured retailer to non-affiliate", async () => {
    const { retailers } = await retailersWith({
      NEXT_PUBLIC_RETAILER_HOME_DEPOT_URL: "https://example.test/s/{query}",
    });
    expect(retailers[0].affiliate).toBe(false);
  });

  it("encodes the search term into the URL", async () => {
    const { retailerUrl, retailers } = await retailersWith({
      NEXT_PUBLIC_RETAILER_HOME_DEPOT_URL: "https://example.test/s/{query}",
    });
    expect(retailerUrl(retailers[0], "ready mix concrete")).toBe(
      "https://example.test/s/ready%20mix%20concrete",
    );
  });

  it("ships no affiliate identifier in the repository", async () => {
    /*
     * The check that matters most. A tag committed here would be live the
     * moment anyone enabled the feature, without a decision being made.
     */
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/config/retailers.ts", "utf8");

    for (const marker of ["tag=", "aff_id", "affiliate_id", "linkCode", "ascsubtag", "clickref"]) {
      expect(source, `retailers.ts contains "${marker}"`).not.toContain(marker);
    }
    // And no hardcoded retailer host — every destination comes from the env.
    for (const host of ["homedepot.com", "lowes.com", "amazon.com"]) {
      expect(source, `retailers.ts hardcodes ${host}`).not.toContain(host);
    }
  });
});

describe("materials carry a destination", () => {
  it("preserves the search term into the shopping list", () => {
    /*
     * The regression this exists for: `buildShoppingList` used to map materials
     * to `{ id, label, detail, optional }` and drop `searchTerm` on the floor.
     * Every calculation set it; nothing could read it. Losing it again would
     * silently make per-material retailer links impossible.
     */
    const concrete = projects.find((project) => project.slug === "concrete-calculator")!;
    const evaluation = evaluate(concrete, defaultValues(concrete, "us"), "us");
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) return;

    const withTerms = evaluation.result.materials.filter((line) => line.searchTerm);
    expect(withTerms.length, "the concrete planner sets search terms").toBeGreaterThan(0);

    const list = buildShoppingList(evaluation.result, "us");
    for (const material of withTerms) {
      const entry = list.find((item) => item.id === `material:${material.id}`);
      expect(entry?.searchTerm, material.name).toBe(material.searchTerm);
    }
  });

  it("gives most planners something to link to", () => {
    // Not a hard requirement per planner, but if this drops to nothing the
    // retailer layer has no material to work with.
    const covered = projects.filter((project) => {
      const evaluation = evaluate(project, defaultValues(project, "us"), "us");
      return evaluation.ok && evaluation.result.materials.some((line) => line.searchTerm);
    });
    expect(covered.length).toBeGreaterThanOrEqual(projects.length - 2);
  });

  it("never lets a user's dimensions reach a search term", () => {
    /*
     * The property is that a search term does not *vary* with input, not that
     * it contains no digits — "2x4 lumber" is a product name, and an earlier
     * version of this test failed on it for no good reason.
     *
     * So: evaluate each planner twice at deliberately different dimensions and
     * require the terms to come out identical. A term built from what someone
     * typed would differ between the two runs, and would then be handed
     * straight to a third-party URL.
     */
    for (const project of projects) {
      const base = defaultValues(project, "us");
      const scaled = Object.fromEntries(
        Object.entries(base).map(([key, value]) =>
          typeof value === "number" ? [key, value * 2 + 3] : [key, value],
        ),
      );

      const first = evaluate(project, base, "us");
      const second = evaluate(project, scaled, "us");
      if (!first.ok || !second.ok) continue;

      /*
       * Compared per material id, not as a whole list. The *set* of materials
       * is allowed to change with size — the mulch planner switches from bags
       * to bulk past about a cubic yard, which is the engine working correctly.
       * What must not change is the term attached to a given material.
       */
      const before = new Map(first.result.materials.map((line) => [line.id, line.searchTerm]));
      for (const line of second.result.materials) {
        if (!before.has(line.id)) continue;
        expect(line.searchTerm, `${project.slug}: ${line.id}`).toBe(before.get(line.id));
      }
    }
  });
});
