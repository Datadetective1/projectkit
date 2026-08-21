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

describe("only approved programmes are live", () => {
  it("ships Amazon, and only Amazon", async () => {
    const { retailers } = await retailersWith({});
    expect(retailers.map((retailer) => retailer.id)).toEqual(["amazon"]);
  });

  it("uses the approved store id and Amazon's documented search endpoint", async () => {
    const { retailers } = await retailersWith({});
    const amazon = retailers.find((retailer) => retailer.id === "amazon")!;
    expect(amazon.searchUrlTemplate).toContain("tag=cubitora86-20");
    expect(amazon.searchUrlTemplate).toContain("https://www.amazon.com/s?k={query}");
    expect(amazon.affiliate).toBe(true);
  });

  it("carries the exact disclosure the Associates agreement requires", async () => {
    // Paraphrasing this is a compliance failure, so it is asserted verbatim.
    const { retailers } = await retailersWith({});
    const amazon = retailers.find((retailer) => retailer.id === "amazon")!;
    expect(amazon.disclosure).toBe(
      "As an Amazon Associate, Cubitora earns from qualifying purchases.",
    );
  });

  it("does not ship Home Depot, whose application is still under review", async () => {
    /*
     * Implemented and configurable, deliberately absent. Home Depot appears
     * only if someone supplies a URL, which nobody should until Impact
     * approves the application and issues tracking details.
     */
    const { retailers } = await retailersWith({});
    expect(retailers.some((retailer) => retailer.id === "home_depot")).toBe(false);
  });

  it("has no Lowe's slot to configure", async () => {
    // Checked as behaviour, not as a word in the file — the source says why
    // Lowe's is absent, and a test that forbids the explanation is silly.
    const mod = await retailersWith({
      NEXT_PUBLIC_RETAILER_LOWES_URL: "https://example.test/s?k={query}",
    });
    expect(mod.retailers.map((retailer) => retailer.id)).toEqual(["amazon"]);
  });

  it("can be killed from the environment without a deploy", async () => {
    // The remaining reason for the flag: suspend every outbound link at once.
    const off = await retailersWith({ NEXT_PUBLIC_WHERE_TO_BUY_ENABLED: "false" });
    expect(off.whereToBuyEnabled).toBe(false);

    const on = await retailersWith({});
    expect(on.whereToBuyEnabled).toBe(true);
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

  it("defaults an environment-configured retailer to non-affiliate", async () => {
    // Commercial status is declared, never inferred from a URL existing.
    const { retailers } = await retailersWith({
      NEXT_PUBLIC_RETAILER_HOME_DEPOT_URL: "https://example.test/s/{query}",
    });
    const homeDepot = retailers.find((retailer) => retailer.id === "home_depot")!;
    expect(homeDepot.affiliate).toBe(false);
  });

  it("encodes the search term into the URL", async () => {
    const { retailerUrl, retailers } = await retailersWith({});
    const amazon = retailers.find((retailer) => retailer.id === "amazon")!;
    expect(retailerUrl(amazon, "ready mix concrete")).toBe(
      "https://www.amazon.com/s?k=ready%20mix%20concrete&tag=cubitora86-20",
    );
  });

  it("ships exactly one affiliate identifier, and it is the approved one", async () => {
    /*
     * This test used to assert that *no* identifier existed anywhere. That was
     * right while nothing was approved; it is wrong now, and loosening it to
     * "any id is fine" would throw away the protection entirely.
     *
     * So it is narrowed rather than deleted: the only tracking parameter in the
     * file must be Amazon's approved store id, and no unapproved retailer may
     * carry a hardcoded destination. A Home Depot URL appearing here before the
     * application is approved fails this.
     */
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/config/retailers.ts", "utf8");

    // Every tracking parameter that actually resolves, across every retailer.
    const { retailers, retailerUrl } = await retailersWith({});
    const tags = retailers
      .flatMap((retailer) => [...retailerUrl(retailer, "x").matchAll(/[?&]tag=([^&]+)/g)])
      .map((match) => match[1]);
    expect(tags).toEqual(["cubitora86-20"]);

    for (const marker of ["aff_id", "affiliate_id", "linkCode", "ascsubtag", "clickref"]) {
      expect(source, `retailers.ts contains "${marker}"`).not.toContain(marker);
    }
    for (const host of ["homedepot.com", "lowes.com"]) {
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

describe("affiliate links stay out of offline content", () => {
  it("never reaches the Project Pack PDF", async () => {
    /*
     * An Associates Operating Agreement rule, not a preference: affiliate
     * links must not appear in email, PDFs, or other offline material. The
     * Project Pack is a downloadable PDF, so it must be built without them.
     *
     * Asserted against the pack builder rather than trusted to a code review,
     * because the failure mode is a compliance breach that nothing in the UI
     * would reveal.
     */
    const { readFileSync } = await import("node:fs");
    const packSources = [
      "src/lib/pack/buildPack.ts",
      "src/components/pack/PackDocument.tsx",
    ];

    for (const path of packSources) {
      const source = readFileSync(path, "utf8");
      expect(source, `${path} imports the retailer layer`).not.toContain("WhereToBuy");
      expect(source, `${path} references a retailer config`).not.toContain("retailers");
      expect(source, `${path} carries an associate tag`).not.toContain("tag=");
    }
  });

  it("is hidden from print", async () => {
    // The shopping list is printable from the browser as well as downloadable.
    // `pk-no-print` is what keeps the links off paper.
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/components/monetization/WhereToBuy.tsx", "utf8");
    expect(source).toContain("pk-no-print");
  });
});
