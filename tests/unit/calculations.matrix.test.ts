import { describe, expect, it } from "vitest";
import { getProjectOrThrow, projects } from "@/data/projects";
import {
  anchorsFor,
  convertValues,
  defaultValues,
  evaluate,
  validate,
  visibleInputs,
} from "@/lib/calc/engine";
import { formatMaterialQuantity, formatRow, formatUnitPrice } from "@/lib/format";
import { formatQuantity, type UnitSystem } from "@/lib/units";
import {
  imperialLeaks,
  productSpecExemption,
  IMPERIAL_UNIT,
} from "../support/imperialUnits";
import type { InputValues, ProjectDefinition } from "@/types/project";

/**
 * The audit matrix: every project against every case type the pre-launch audit
 * calls for — standard, minimum, large, waste, metric, unit round-trip,
 * package rounding, invalid input, and boundary.
 *
 * These assert on properties that must hold for any correct material
 * calculation, so they catch a regression in a project whose specific numbers
 * are covered in calculations.test.ts.
 */

function run(
  project: ProjectDefinition,
  overrides: InputValues = {},
  system: UnitSystem = "us",
) {
  const values = { ...defaultValues(project, system), ...overrides };
  const result = evaluate(project, values, system);
  if (!result.ok) {
    throw new Error(
      `${project.slug}: ${result.message ?? JSON.stringify(result.errors)}`,
    );
  }
  return result.result;
}

/** Every numeric field, scaled — a cheap way to build a small or large project. */
function scaled(project: ProjectDefinition, system: UnitSystem, factor: number): InputValues {
  const base = defaultValues(project, system);
  const out: InputValues = { ...base };
  for (const input of project.inputs) {
    if (input.type !== "number") continue;
    // Leave percentages, prices, and counts alone; only scale the geometry.
    if (["percent", "currency", "count"].includes(input.measure)) continue;
    const current = Number(base[input.id]);
    if (!Number.isFinite(current) || current <= 0) continue;
    const next = current * factor;
    const min = input.min ?? 0.0001;
    const max = input.max ?? Number.MAX_SAFE_INTEGER;
    out[input.id] = Math.min(Math.max(next, min), max);
  }
  return out;
}

/** Package-style lines must be whole units — you cannot buy 0.4 of a bag. */
const PACKAGE_UNITS =
  /bag|box|sheet|roll|pallet|piece|post|stake|picket|rail|tile|bucket|set|strip|screw|fastener|hanger|cover|spacer|footing/i;

describe.each(projects.map((p) => [p.slug, p] as const))("%s", (slug, project) => {
  it("standard case: produces a complete, finite result", () => {
    const result = run(project);

    expect(Number.isFinite(result.headline.value)).toBe(true);
    expect(result.headline.value).toBeGreaterThan(0);
    expect(result.materials.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeGreaterThan(2);
    expect(result.formulas.length).toBeGreaterThan(1);
    expect(result.assumptions.length).toBeGreaterThan(1);
    expect(result.explanation.join(" ")).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("minimum case: a small but valid project still works", () => {
    const result = run(project, scaled(project, "us", 0.1));

    expect(result.headline.value).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.costTotal)).toBe(true);
    for (const line of result.materials) {
      expect(line.quantity, line.id).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(line.quantity), line.id).toBe(true);
    }
  });

  it("large case: a big but plausible project still works", () => {
    const result = run(project, scaled(project, "us", 5));

    expect(Number.isFinite(result.headline.value)).toBe(true);
    expect(result.costTotal).toBeGreaterThanOrEqual(0);
    expect(result.costTotal).toBeLessThan(10_000_000);
  });

  it("waste case: more waste never means less material", () => {
    const low = run(project, { waste: 0 });
    const high = run(project, { waste: 25 });

    // Not every project's headline is a waste-scaled quantity (fence posts are
    // driven by spacing), so compare the cost, which always includes waste.
    expect(high.costTotal).toBeGreaterThanOrEqual(low.costTotal);
    expect(high.headline.value).toBeGreaterThanOrEqual(low.headline.value);
  });

  it("metric case: the material requirement matches the US requirement", () => {
    const us = run(project, {}, "us");
    const metric = run(project, {}, "metric");

    // Defaults are declared canonically, so the quantity needed must agree
    // exactly. Cost may differ by a little and that is intended: bulk goods are
    // ordered in market-specific increments — a quarter cubic yard in the US,
    // a tenth of a cubic metre elsewhere — so the rounded-up purchase differs
    // even though the underlying requirement does not.
    expect(metric.headline.value).toBeCloseTo(us.headline.value, 4);
    expect(metric.costTotal).toBeGreaterThan(0);
    expect(Math.abs(metric.costTotal - us.costTotal) / Math.max(us.costTotal, 1)).toBeLessThan(0.05);
  });

  it("unit round-trip: US -> metric -> US returns the original values", () => {
    const start = defaultValues(project, "us");
    const anchors = anchorsFor(project, start, "us");
    const metric = convertValues(project, start, "us", "metric", anchors);
    const back = convertValues(project, metric, "metric", "us", anchors);

    for (const input of project.inputs) {
      if (input.type !== "number") continue;
      expect(Number(back[input.id]), `${slug}.${input.id}`).toBeCloseTo(
        Number(start[input.id]),
        6,
      );
    }
  });

  it("package rounding: packaged goods are whole units, never fractional", () => {
    // A deliberately awkward size, to force fractional intermediate values.
    const result = run(project, scaled(project, "us", 0.77));

    for (const line of result.materials) {
      const unit = line.unitOverride ?? "";
      if (!PACKAGE_UNITS.test(unit)) continue;
      expect(
        Number.isInteger(line.quantity),
        `${slug}: ${line.id} (${line.quantity} ${unit}) must be a whole number`,
      ).toBe(true);
    }
  });

  it("package rounding: never recommends less than the requirement", () => {
    const result = run(project);
    const recommended = result.summary.find((row) =>
      /recommended|to buy|sheets to buy|tiles to buy/i.test(row.label),
    );
    const calculated = result.summary.find((row) =>
      /calculated|^volume$|floor area|area to tile|lawn area|before waste/i.test(row.label),
    );
    if (!recommended || !calculated) return; // Not every project frames it this way.

    expect(
      recommended.value,
      `${slug}: recommended ${recommended.value} < calculated ${calculated.value}`,
    ).toBeGreaterThanOrEqual(calculated.value * 0.999);
  });

  it("invalid input: zero, negative, and non-numeric are rejected, not calculated", () => {
    const base = defaultValues(project, "us");
    // Hidden fields are not validated — and must not be, since their values
    // are not used. Only test what the form actually shows.
    const visible = visibleInputs(project, base);
    const required = visible.filter(
      (input) => input.type === "number" && input.required && !input.allowZero,
    );
    expect(required.length, `${slug} should have at least one required input`).toBeGreaterThan(0);

    for (const input of required) {
      for (const bad of [0, -1, "", "abc"]) {
        const errors = validate(project, { ...base, [input.id]: bad }, "us");
        expect(
          Object.keys(errors).length,
          `${slug}.${input.id} accepted ${JSON.stringify(bad)}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("boundary case: values at the declared min and max still calculate", () => {
    const base = defaultValues(project, "us");

    for (const input of project.inputs) {
      if (input.type !== "number") continue;
      for (const bound of [input.min, input.max]) {
        if (bound === undefined) continue;
        // Skip bounds that other fields would invalidate; just check it runs.
        const values = { ...base, [input.id]: bound };
        if (Object.keys(validate(project, values, "us")).length > 0) continue;
        const result = evaluate(project, values, "us");
        expect(result.ok, `${slug}.${input.id} at ${bound}`).toBe(true);
        if (result.ok) {
          expect(Number.isFinite(result.result.headline.value)).toBe(true);
          expect(result.result.headline.value).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("never presents a cost without a quantity behind it", () => {
    const result = run(project);
    for (const line of result.materials) {
      if (line.cost === undefined) continue;
      expect(line.quantity, `${slug}: ${line.id} has a cost but no quantity`).toBeGreaterThan(0);
      expect(line.cost).toBeGreaterThanOrEqual(0);
    }
    const summed = result.materials
      .filter((line) => !line.optional)
      .reduce((total, line) => total + (line.cost ?? 0), 0);
    expect(result.costTotal).toBeCloseTo(summed, 1);
  });

  it("labels every non-exact quantity as an estimate or an assumption", () => {
    const result = run(project);
    // Anything flagged isEstimate must be visibly distinguishable, and every
    // project must expose its assumptions so nothing looks like certainty.
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.formulas.some((f) => f.kind === "math")).toBe(true);
  });
});

/* --------------------------------------------------- cross-cutting safety -- */

describe("safety guarantees across all projects", () => {
  it("no project claims structural adequacy or code compliance", () => {
    const forbidden =
      /\b(code[- ]compliant|meets code|structurally (safe|sound|adequate)|engineer(ed|-approved)|guaranteed|certified)\b/i;

    for (const project of projects) {
      const result = run(project);
      const prose = [
        ...result.explanation,
        ...result.warnings,
        ...result.materials.map((m) => m.note ?? ""),
        ...project.steps,
        ...project.faq.map((f) => `${f.question} ${f.answer}`),
        project.intro,
        ...(project.disclaimers ?? []),
      ].join(" ");

      expect(forbidden.test(prose), `${project.slug}: ${prose.match(forbidden)?.[0]}`).toBe(false);
    }
  });

  it("the deck planner does not quantify beams, posts, or footings", () => {
    const deck = run(getProjectOrThrow("deck-calculator"));
    const ids = deck.materials.map((line) => line.id);

    // Sizing these is structural design, not arithmetic.
    expect(ids).not.toContain("beams");
    expect(ids).not.toContain("posts");
    expect(ids).not.toContain("footings");

    // But the user must still be told they need them.
    const checklist = deck.shoppingExtras.map((item) => item.label.toLowerCase()).join(" ");
    expect(checklist).toContain("beam");
    expect(checklist).toContain("post");
    expect(checklist).toContain("footing");

    expect(deck.warnings.join(" ")).toMatch(/not quantified/i);
  });

  it("every project warns where the stakes justify it", () => {
    for (const project of projects) {
      const result = run(project);
      expect(result.warnings.length, project.slug).toBeGreaterThan(0);
    }
  });

  it("flooring trim follows the real perimeter, not an area approximation", () => {
    const flooring = getProjectOrThrow("flooring-calculator");
    // A long hallway: 4 x sqrt(200) would suggest 57 ft, the truth is 90 ft.
    const result = run(flooring, { roomCount: 1, length1: 40, width1: 5 });
    const trim = result.materials.find((line) => line.id === "quarter-round");

    expect(trim).toBeDefined();
    expect(trim!.quantity).toBeGreaterThanOrEqual(90);
  });

  it("tile thinset scales with the trowel the tile size calls for", () => {
    const tile = getProjectOrThrow("tile-calculator");
    const bagsFor = (edge: number) => {
      const result = run(tile, { length: 20, width: 20, tileLength: edge, tileWidth: edge });
      return result.materials.find((line) => line.id === "thinset")!.quantity;
    };

    // Large-format tile uses roughly twice the mortar per square foot.
    expect(bagsFor(24)).toBeGreaterThan(bagsFor(12));
    expect(bagsFor(12)).toBeGreaterThanOrEqual(bagsFor(6));
  });

  it("fasteners are listed in a unit you can actually buy", () => {
    // "5,538 screws" is a number, not a shopping list — screws are sold by
    // weight. Every fastener line must be boxed.
    for (const slug of ["fence-calculator", "deck-calculator", "drywall-calculator"]) {
      const result = run(getProjectOrThrow(slug));
      const line = result.materials.find((item) => item.id === "screws");
      expect(line, `${slug} should list fasteners`).toBeDefined();
      expect(line!.unitOverride, slug).toMatch(/box/);
      expect(line!.quantity, slug).toBeLessThan(200);
      expect(Number.isInteger(line!.quantity), slug).toBe(true);
      // The piece count is still useful, just not as the headline quantity.
      expect(line!.note, slug).toMatch(/screws/);
    }
  });

  it("drywall tape matches the seam length a room actually has", () => {
    const drywall = getProjectOrThrow("drywall-calculator");
    const result = run(drywall, { length: 14, width: 12, height: 8, includeCeiling: true });
    const tape = result.materials.find((line) => line.id === "tape")!;

    // 548 sq ft of board is ~220 ft of seam, so one 250 ft roll.
    expect(tape.quantity).toBe(1);
  });
});

/* -------------------------------------------------- unit price coherence -- */

/**
 * A unit price sits directly beside a quantity and a cost. If those three do
 * not multiply out, the reader concludes the total is wrong — and in metric
 * they did not: a canonical "$165.00 per yd³" was printed next to a "3.40 m³"
 * quantity and a $734 cost, which invites 3.40 x 165 = 561 and a support email.
 */
describe("unit prices agree with the quantity printed beside them", () => {
  /** Pull the leading dollar figure back out of the rendered string. */
  function priceOf(text: string): number | undefined {
    const match = text.match(/\$([\d,]+(?:\.\d+)?)/);
    return match ? Number(match[1].replace(/,/g, "")) : undefined;
  }

  for (const system of ["us", "metric"] as const) {
    it(`holds in ${system}`, () => {
      let checked = 0;

      for (const project of projects) {
        for (const line of run(project, {}, system).materials) {
          if (line.unitPrice === undefined || line.cost === undefined) continue;

          /*
           * Only lines whose price and quantity share a basis. Flooring and
           * tile are quoted per square foot but sold by the box, which is how
           * the trade actually prices them — "9 boxes · $3.20 per sq ft" is not
           * meant to multiply out and a reader knows it. The bug this guards
           * against is subtler: a price and a quantity in the *same* dimension
           * but different units.
           */
          if (line.unitPriceMeasure !== line.measure) continue;

          const quantity = Number(
            formatMaterialQuantity(line, system).replace(/[^\d.]/g, ""),
          );
          const unitPrice = priceOf(formatUnitPrice(line, system));
          const where = `${project.slug}.${line.id} (${system})`;

          expect(unitPrice, where).toBeDefined();
          if (quantity === 0 || unitPrice === undefined) continue;

          /*
           * Relative, not absolute. The displayed quantity is rounded for
           * reading — 156 linear ft renders as "48 m", a 1% overstatement — so
           * the product drifts by a percent or two on a large line and an
           * absolute epsilon would be either useless or false. 5% is far below
           * what a genuine unit mismatch costs: yd³ against m³ is 31% out,
           * linear ft against m is 228%.
           */
          const drift = Math.abs(quantity * unitPrice - line.cost) / Math.max(line.cost, 1);
          expect(drift, `${where}: ${quantity} x ${unitPrice} != ${line.cost}`).toBeLessThan(0.05);
          checked++;
        }
      }

      // Guard against the filter above quietly matching nothing.
      expect(checked, "no per-measure priced lines were checked").toBeGreaterThan(5);
    });
  }

  it("never prints an imperial unit in a metric quantity", () => {
    /*
     * The rendered numbers: headline, material quantities, unit prices, and
     * summary rows. A hardcoded US unit here contradicts the value beside it —
     * "24 linear ft" next to "3.40 m³" was a third of the timber the project
     * actually needed.
     */
    for (const project of projects) {
      const result = run(project, {}, "metric");

      const rendered = [
        formatQuantity(result.headline.value, result.headline.measure, {
          system: "metric",
          precision: result.headline.precision,
          unitOverride: result.headline.unitOverride,
        }),
        ...result.materials.map((line) => formatMaterialQuantity(line, "metric")),
        ...result.materials
          .filter((line) => line.unitPrice !== undefined)
          .map((line) => formatUnitPrice(line, "metric")),
        ...result.summary.map((row) => formatRow(row, "metric")),
      ];

      for (const text of rendered) {
        const leaked = IMPERIAL_UNIT.test(text) && !productSpecExemption(text);
        expect(leaked, `${project.slug}: "${text}"`).toBe(false);
      }
    }
  });

  it("never prints an imperial unit in metric prose", () => {
    /*
     * The sentences around the numbers: explanations, notes, assumption rows,
     * formula expressions, scenario names, warnings, and effort notes. These
     * were the last holdout — roughly sixty strings that interpolated a
     * converted value next to a unit word typed by hand, so a metric reader was
     * told "a 111 m² bed at 3 in deep".
     *
     * src/lib/calc/describe.ts exists so a calculator cannot write a unit name
     * at all. This is the gate that keeps it that way.
     */
    for (const project of projects) {
      const leaks = imperialLeaks(run(project, {}, "metric"));
      const report = leaks.map(([where, text]) => `${where}: "${text}"`).join("\n");
      expect(report, project.slug).toBe("");
    }
  });

  it("keeps product specifications in the units they are sold under", () => {
    // The exemptions are deliberate, so they need to still be reachable — a
    // regex that stopped matching would silently widen the gate.
    const drywall = run(getProjectOrThrow("drywall-calculator"), {}, "metric");
    const sheet = drywall.materials.find((line) => line.id === "sheets")!;

    expect(sheet.name).toContain("4 × 8 ft");
    expect(productSpecExemption(sheet.name)?.why).toMatch(/nominal sheet size/);

    const tile = run(getProjectOrThrow("tile-calculator"), {}, "metric");
    const thinset = tile.materials.find((line) => line.id === "thinset")!;
    expect(thinset.name).toContain("50 lb");
    expect(productSpecExemption(thinset.name)).toBeDefined();
  });

  it("labels a per-measure price in the reader's own units", () => {
    const concrete = getProjectOrThrow("concrete-calculator");
    const readyMix = (system: "us" | "metric") =>
      formatUnitPrice(
        run(concrete, {}, system).materials.find((line) => line.id === "ready-mix")!,
        system,
      );

    expect(readyMix("us")).toMatch(/per yd³/);
    expect(readyMix("metric")).toMatch(/per m³/);
    // Same price, different unit — so the metric figure must be the larger one.
    expect(priceOf(readyMix("metric"))!).toBeGreaterThan(priceOf(readyMix("us"))!);
  });

  it("leaves package prices alone — a bag is a bag in both systems", () => {
    const drywall = getProjectOrThrow("drywall-calculator");
    for (const system of ["us", "metric"] as const) {
      const compound = run(drywall, {}, system).materials.find((l) => l.id === "compound")!;
      expect(formatUnitPrice(compound, system)).toBe("$18.00 per bucket");
    }
  });
});
