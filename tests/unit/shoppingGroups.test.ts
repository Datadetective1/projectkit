import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import { buildShoppingList } from "@/components/results/ShoppingList";
import {
  countLocalOnly,
  countReadyToBuy,
  groupShoppingEntries,
  isDeliverableOnline,
  isSupply,
  materialIdOf,
} from "@/lib/shopping/groups";

/**
 * The grouping the whole redesign rests on.
 *
 * The results page now leads with a claim — "2 items ready to buy" — and a
 * button that acts on it. If that count disagrees with the list underneath, the
 * page is lying to somebody about their own project, which costs more trust
 * than the shopping feature earns. So the rule is tested against every planner
 * rather than against a fixture.
 */

/** Every planner's default shopping list, built the way the page builds it. */
function listFor(slug: string) {
  const project = projects.find((item) => item.slug === slug)!;
  const evaluation = evaluate(project, defaultValues(project, "us"), "us");
  expect(evaluation.ok, slug).toBe(true);
  if (!evaluation.ok) throw new Error("unreachable");
  return buildShoppingList(evaluation.result, "us");
}

describe("what can actually be bought online", () => {
  it("keeps parcel-sized goods", () => {
    expect(
      isDeliverableOnline({ id: "material:screws", searchTerm: "deck screws", measure: "count" }),
    ).toBe(true);
    expect(
      isDeliverableOnline({ id: "material:paint", searchTerm: "interior paint", measure: "volumeLiquid" }),
    ).toBe(true);
    expect(
      isDeliverableOnline({ id: "material:tile", searchTerm: "ceramic tile", measure: "area" }),
    ).toBe(true);
  });

  it("rejects anything that arrives on a truck", () => {
    // Bulk by the cubic yard, by the ton, or by the linear foot.
    expect(
      isDeliverableOnline({ id: "material:ready-mix", searchTerm: "concrete", measure: "volumeYd" }),
    ).toBe(false);
    expect(
      isDeliverableOnline({ id: "material:gravel", searchTerm: "gravel", measure: "weight" }),
    ).toBe(false);
    expect(
      isDeliverableOnline({ id: "material:decking", searchTerm: "decking", measure: "length" }),
    ).toBe(false);
    // Sod is measured in square feet like tile, and is still a perishable crop.
    expect(
      isDeliverableOnline({ id: "material:sod-area", searchTerm: "sod", measure: "area" }),
    ).toBe(false);
  });

  it("rejects a line with nothing to search for", () => {
    expect(isDeliverableOnline({ id: "material:mystery", measure: "count" })).toBe(false);
  });

  it("never counts a tool or supply as a material to buy", () => {
    // Extras are real things people need, but they are not part of the
    // estimate and they carry no search term.
    expect(isSupply({ id: "extra:gloves" })).toBe(true);
    expect(isDeliverableOnline({ id: "extra:gloves", searchTerm: "gloves", measure: "count" })).toBe(
      false,
    );
  });

  it("strips the list prefix to recover the authored material id", () => {
    expect(materialIdOf("material:ready-mix")).toBe("ready-mix");
    expect(materialIdOf("extra:gloves")).toBe("gloves");
    expect(materialIdOf("ready-mix")).toBe("ready-mix");
  });
});

describe("the count on the card matches the list underneath", () => {
  it("holds for every planner", () => {
    for (const project of projects) {
      const entries = listFor(project.slug);
      const groups = groupShoppingEntries(entries);

      const online = groups.find((group) => group.id === "online");
      const local = groups.find((group) => group.id === "local");

      expect(online?.entries.length ?? 0, `${project.slug}: online`).toBe(
        countReadyToBuy(entries),
      );
      expect(local?.entries.length ?? 0, `${project.slug}: local`).toBe(countLocalOnly(entries));
    }
  });

  it("loses nothing and duplicates nothing", () => {
    for (const project of projects) {
      const entries = listFor(project.slug);
      const grouped = groupShoppingEntries(entries).flatMap((group) => group.entries);

      expect(grouped.length, project.slug).toBe(entries.length);
      expect(new Set(grouped.map((entry) => entry.id)).size, project.slug).toBe(entries.length);
      // Order within the list is preserved, which is what keeps the checklist
      // reading the same way it did before it was grouped.
      for (const group of groupShoppingEntries(entries)) {
        const positions = group.entries.map((entry) => entries.indexOf(entry));
        expect([...positions].sort((a, b) => a - b), project.slug).toEqual(positions);
      }
    }
  });

  it("never emits an empty group", () => {
    for (const project of projects) {
      for (const group of groupShoppingEntries(listFor(project.slug))) {
        expect(group.entries.length, `${project.slug}: ${group.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("the planners that have nothing to buy online", () => {
  /*
   * The case that decides the shape of the primary call to action. Bulk mulch,
   * gravel and sod arrive by the load from a local yard — there is no version
   * of any of them that turns up in a parcel. A "Shop these materials" button
   * on these three would open an empty sheet, which is worse than the buried
   * list it replaced.
   */
  const BULK_ONLY = ["mulch-calculator", "gravel-calculator", "sod-calculator"];

  it("reports zero, and says so honestly", () => {
    for (const slug of BULK_ONLY) {
      const entries = listFor(slug);
      expect(countReadyToBuy(entries), slug).toBe(0);
      expect(countLocalOnly(entries), slug).toBeGreaterThan(0);

      const groups = groupShoppingEntries(entries);
      expect(groups.find((group) => group.id === "online"), `${slug} offered an empty online group`)
        .toBeUndefined();

      const local = groups.find((group) => group.id === "local");
      expect(local, slug).toBeDefined();
      // The heading has to name the alternative, not merely omit a button.
      expect(local!.title, slug).toMatch(/local/i);
      expect(local!.note, slug).toMatch(/supplier/i);
    }
  });

  it("still gives them a full list to take to a supplier", () => {
    for (const slug of BULK_ONLY) {
      const groups = groupShoppingEntries(listFor(slug));
      const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
      expect(total, slug).toBeGreaterThan(1);
    }
  });
});

describe("the planners that are mostly buyable", () => {
  it("finds everything for the parcel-sized projects", () => {
    // Fence, paint, drywall and tile are entirely parcel-deliverable, and are
    // where the shopping journey should feel best.
    for (const slug of [
      "fence-calculator",
      "paint-calculator",
      "drywall-calculator",
      "tile-calculator",
    ]) {
      const entries = listFor(slug);
      expect(countReadyToBuy(entries), slug).toBeGreaterThan(0);
      expect(countLocalOnly(entries), slug).toBe(0);
    }
  });

  it("splits the mixed ones rather than hiding either half", () => {
    // Concrete, flooring and deck have both. Both groups must appear.
    for (const slug of ["concrete-calculator", "flooring-calculator", "deck-calculator"]) {
      const entries = listFor(slug);
      expect(countReadyToBuy(entries), slug).toBeGreaterThan(0);
      expect(countLocalOnly(entries), slug).toBeGreaterThan(0);

      const ids = groupShoppingEntries(entries).map((group) => group.id);
      expect(ids, slug).toContain("online");
      expect(ids, slug).toContain("local");
    }
  });
});

describe("the grouping does not vary with what the user types", () => {
  it("gives the same answer at a different size", () => {
    /*
     * The counts appear in a headline claim, so they must be a property of the
     * project rather than of the dimensions. Doubling every number must not
     * move an item between groups — except where the engine itself legitimately
     * swaps a material, which is why this compares by id rather than by count.
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

      const groupOf = (result: typeof first) => {
        if (!result.ok) return new Map<string, string>();
        const map = new Map<string, string>();
        for (const group of groupShoppingEntries(buildShoppingList(result.result, "us"))) {
          for (const entry of group.entries) map.set(entry.id, group.id);
        }
        return map;
      };

      const before = groupOf(first);
      const after = groupOf(second);

      for (const [id, group] of after) {
        if (!before.has(id)) continue;
        expect(group, `${project.slug}: ${id} changed group with size`).toBe(before.get(id));
      }
    }
  });

  it("gives the same answer in metric", () => {
    for (const project of projects) {
      const us = evaluate(project, defaultValues(project, "us"), "us");
      const metric = evaluate(project, defaultValues(project, "metric"), "metric");
      if (!us.ok || !metric.ok) continue;

      expect(
        countReadyToBuy(buildShoppingList(metric.result, "metric")),
        project.slug,
      ).toBe(countReadyToBuy(buildShoppingList(us.result, "us")));
    }
  });
});
