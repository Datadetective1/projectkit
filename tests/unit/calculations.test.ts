import { describe, expect, it } from "vitest";
import { getProjectOrThrow, projects } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import type { UnitSystem } from "@/lib/units";
import type { InputValues } from "@/types/project";

/** Run a project with its defaults, overridden by `overrides` (display units). */
function run(slug: string, overrides: InputValues = {}, system: UnitSystem = "us") {
  const project = getProjectOrThrow(slug);
  const values = { ...defaultValues(project, system), ...overrides };
  const result = evaluate(project, values, system);
  if (!result.ok) {
    throw new Error(
      `evaluate failed: ${result.message ?? JSON.stringify(result.errors)}`,
    );
  }
  return result.result;
}

function summaryValue(
  result: ReturnType<typeof run>,
  label: string,
): number {
  const row = result.summary.find((item) => item.label === label);
  if (!row) throw new Error(`No summary row "${label}"`);
  return row.value;
}

function material(result: ReturnType<typeof run>, id: string) {
  const line = result.materials.find((item) => item.id === id);
  if (!line) throw new Error(`No material "${id}"`);
  return line;
}

/* ------------------------------------------------------------- concrete -- */

describe("concrete", () => {
  it("computes the reference 20 × 16 × 4 in slab", () => {
    const result = run("concrete-calculator", { length: 20, width: 16, thickness: 4, waste: 0 });

    expect(summaryValue(result, "Project area")).toBeCloseTo(320, 6);
    // 320 sq ft × (4/12) ft = 106.67 cu ft = 3.9506 yd³
    expect(summaryValue(result, "Calculated volume")).toBeCloseTo(3.9506, 3);
    expect(result.headline.value).toBeCloseTo(3.9506, 3);
  });

  it("applies waste on top of the raw volume", () => {
    const result = run("concrete-calculator", { length: 20, width: 16, thickness: 4, waste: 10 });
    expect(result.headline.value).toBeCloseTo(3.9506 * 1.1, 3);
    // Ready-mix is ordered in quarter-yard increments.
    expect(summaryValue(result, "Recommended purchase")).toBe(4.5);
  });

  it("rounds the purchase quantity up, never down", () => {
    const exact = run("concrete-calculator", { length: 9, width: 9, thickness: 4, waste: 0 });
    expect(exact.headline.value).toBeCloseTo(1.0, 6);
    expect(summaryValue(exact, "Recommended purchase")).toBe(1);

    const over = run("concrete-calculator", { length: 9.1, width: 9, thickness: 4, waste: 0 });
    expect(summaryValue(over, "Recommended purchase")).toBe(1.25);
  });

  it("counts whole bags only", () => {
    const result = run("concrete-calculator", {
      length: 4,
      width: 4,
      thickness: 4,
      waste: 0,
      bagYield: "0.45",
    });
    // 16 sq ft × 1/3 ft = 5.333 cu ft ÷ 0.45 = 11.85 → 12 bags
    const bags = result.scenarios.find((scenario) => scenario.id === "bags");
    expect(bags?.rows[0].value).toBe(12);
  });

  it("recommends bags for small pours and ready-mix for large ones", () => {
    const small = run("concrete-calculator", { length: 4, width: 4, thickness: 4 });
    expect(small.scenarios.find((s) => s.id === "bags")?.recommended).toBe(true);

    const large = run("concrete-calculator", { length: 20, width: 16, thickness: 4 });
    expect(large.scenarios.find((s) => s.id === "ready-mix")?.recommended).toBe(true);
  });

  it("drops the base course when depth is zero", () => {
    const result = run("concrete-calculator", { baseDepth: 0 });
    expect(result.materials.some((line) => line.id === "base-gravel")).toBe(false);
  });

  it("produces the same volume in metric", () => {
    // 20 ft ≈ 6.096 m, 16 ft ≈ 4.8768 m, 4 in ≈ 10.16 cm
    const metric = run(
      "concrete-calculator",
      { length: 6.096, width: 4.8768, thickness: 10.16, waste: 0 },
      "metric",
    );
    // 3.9506 yd³ × 0.764555 = 3.0206 m³ — but headline is stored canonically.
    expect(metric.headline.value).toBeCloseTo(3.9506, 3);
  });
});

/* ---------------------------------------------------------------- fence -- */

describe("fence", () => {
  it("computes an enclosed yard with one gate", () => {
    const result = run("fence-calculator", {
      layout: "rectangle",
      length: 75,
      width: 110,
      height: 6,
      gateCount: 1,
      gateWidth: 4,
      postSpacing: 8,
    });

    // Perimeter 370 ft, less a 4 ft gate = 366 ft of fence.
    expect(summaryValue(result, "Total fence line")).toBe(370);
    expect(summaryValue(result, "Fenced run")).toBe(366);
    // ⌈366 / 8⌉ = 46 sections
    expect(summaryValue(result, "Sections")).toBe(46);
    // Closed loop: 46 line posts + 2 gate posts − 1 shared = 47
    expect(summaryValue(result, "Posts")).toBe(47);
  });

  it("adds an extra post for an open run", () => {
    const result = run("fence-calculator", {
      layout: "straight",
      runLength: 80,
      gateCount: 0,
      postSpacing: 8,
    });
    expect(summaryValue(result, "Sections")).toBe(10);
    expect(summaryValue(result, "Posts")).toBe(11);
  });

  it("counts pickets from width plus gap", () => {
    const result = run("fence-calculator", {
      layout: "straight",
      runLength: 10,
      gateCount: 0,
      picketWidth: 5.5,
      picketGap: 0,
      waste: 0,
    });
    // 120 in ÷ 5.5 = 21.8 → 22 pickets
    expect(material(result, "pickets").quantity).toBe(22);
  });

  it("handles a fence with no gates", () => {
    const result = run("fence-calculator", { gateCount: 0 });
    expect(result.materials.some((line) => line.id === "gate-hardware")).toBe(false);
    expect(summaryValue(result, "Gate openings")).toBe(0);
  });
});

/* ---------------------------------------------------------------- paint -- */

describe("paint", () => {
  it("computes a 12 × 12 room with 8 ft ceilings", () => {
    const result = run("paint-calculator", {
      length: 12,
      width: 12,
      height: 8,
      coats: 2,
      rooms: 1,
      doors: 1,
      windows: 2,
      coverage: 350,
      includeCeiling: false,
    });

    // Walls 2 × (12+12) × 8 = 384; openings 21 + 30 = 51; net 333
    expect(summaryValue(result, "Wall area (less openings)")).toBe(333);
    // 333 × 2 ÷ 350 = 1.903 gallons → 2.00 after quarter rounding
    expect(summaryValue(result, "Paint needed (exact)")).toBeCloseTo(1.9029, 3);
    expect(summaryValue(result, "Recommended purchase")).toBe(2);
  });

  it("scales linearly with room count", () => {
    const one = run("paint-calculator", { rooms: 1 });
    const three = run("paint-calculator", { rooms: 3 });
    expect(summaryValue(three, "Wall area (less openings)")).toBe(
      summaryValue(one, "Wall area (less openings)") * 3,
    );
  });

  it("adds the ceiling only when requested", () => {
    const without = run("paint-calculator", { includeCeiling: false });
    const withCeiling = run("paint-calculator", { includeCeiling: true });
    expect(withCeiling.headline.value).toBeGreaterThan(without.headline.value);
  });

  it("never deducts more openings than there is wall", () => {
    const result = run("paint-calculator", {
      length: 4,
      width: 4,
      height: 8,
      doors: 10,
      windows: 10,
    });
    expect(summaryValue(result, "Wall area (less openings)")).toBe(0);
    expect(result.headline.value).toBeGreaterThanOrEqual(0);
  });
});

/* ------------------------------------------------------------- flooring -- */

describe("flooring", () => {
  it("computes boxes and leftover", () => {
    const result = run("flooring-calculator", {
      roomCount: 1,
      length1: 15,
      width1: 12,
      waste: 10,
      sqFtPerBox: 24,
    });
    // 180 sq ft × 1.1 = 198 → ⌈198/24⌉ = 9 boxes → 216 sq ft coverage
    expect(summaryValue(result, "Floor area")).toBe(180);
    expect(summaryValue(result, "Boxes")).toBe(9);
    expect(summaryValue(result, "Leftover after install")).toBe(36);
  });

  it("adds up multiple areas", () => {
    const result = run("flooring-calculator", {
      roomCount: 3,
      length1: 10,
      width1: 10,
      length2: 10,
      width2: 10,
      length3: 10,
      width3: 10,
    });
    expect(summaryValue(result, "Floor area")).toBe(300);
  });

  it("prefers price per box when one is supplied", () => {
    const perSqFt = run("flooring-calculator", { pricePerSqFt: 3, pricePerBox: 0 });
    const perBox = run("flooring-calculator", { pricePerSqFt: 3, pricePerBox: 100 });
    expect(perBox.costTotal).toBeGreaterThan(perSqFt.costTotal);
  });
});

/* ---------------------------------------------------------------- mulch -- */

describe("mulch", () => {
  it("computes a rectangular bed", () => {
    const result = run("mulch-calculator", {
      shape: "rectangle",
      length: 40,
      width: 30,
      depth: 3,
      waste: 0,
    });
    // 1200 sq ft × 0.25 ft = 300 cu ft = 11.111 yd³
    expect(summaryValue(result, "Bed area")).toBe(1200);
    expect(summaryValue(result, "Volume")).toBeCloseTo(11.111, 3);
  });

  it("computes a circular bed from its diameter", () => {
    const result = run("mulch-calculator", { shape: "circle", diameter: 12, depth: 3, waste: 0 });
    expect(summaryValue(result, "Bed area")).toBeCloseTo(Math.PI * 36, 4);
  });

  it("uses a supplied square footage directly", () => {
    const result = run("mulch-calculator", { shape: "custom", area: 1200, depth: 3, waste: 0 });
    expect(summaryValue(result, "Bed area")).toBe(1200);
  });

  it("counts whole bags", () => {
    const result = run("mulch-calculator", {
      shape: "custom",
      area: 100,
      depth: 3,
      waste: 0,
      bagSize: 2,
    });
    // 25 cu ft ÷ 2 = 12.5 → 13 bags
    expect(summaryValue(result, "Equivalent bags")).toBe(13);
  });
});

/* --------------------------------------------------------------- gravel -- */

describe("gravel", () => {
  it("computes volume and tonnage", () => {
    const result = run("gravel-calculator", {
      length: 40,
      width: 12,
      depth: 4,
      waste: 0,
      material: "100",
      density: 0,
    });
    // 480 sq ft × (4/12) = 160 cu ft = 5.926 yd³ ; 160 × 100 lb ÷ 2000 = 8 tons
    expect(summaryValue(result, "Volume")).toBeCloseTo(5.926, 3);
    expect(summaryValue(result, "Approximate weight")).toBeCloseTo(8, 3);
  });

  it("honours a custom density override", () => {
    const result = run("gravel-calculator", {
      length: 10,
      width: 10,
      depth: 12,
      waste: 0,
      density: 200,
    });
    // 100 cu ft × 200 lb ÷ 2000 = 10 tons
    expect(summaryValue(result, "Approximate weight")).toBeCloseTo(10, 3);
  });
});

/* -------------------------------------------------------------- drywall -- */

describe("drywall", () => {
  it("computes sheets for a room with a ceiling", () => {
    const result = run("drywall-calculator", {
      length: 14,
      width: 12,
      height: 8,
      includeCeiling: true,
      doors: 1,
      windows: 1,
      waste: 10,
      sheetSize: "32",
    });
    // Walls 416 − 36 openings = 380; ceiling 168; total 548 × 1.1 = 602.8
    expect(summaryValue(result, "Wall area (less openings)")).toBe(380);
    expect(summaryValue(result, "Ceiling area")).toBe(168);
    expect(summaryValue(result, "Sheets to buy")).toBe(19); // ⌈602.8 / 32⌉
  });

  it("needs fewer, larger sheets when the size increases", () => {
    const small = run("drywall-calculator", { sheetSize: "32" });
    const large = run("drywall-calculator", { sheetSize: "48" });
    expect(summaryValue(large, "Sheets to buy")).toBeLessThan(
      summaryValue(small, "Sheets to buy"),
    );
  });

  it("skips corner bead when there are no outside corners", () => {
    const result = run("drywall-calculator", { outsideCorners: 0 });
    expect(result.materials.some((line) => line.id === "corner-bead")).toBe(false);
  });
});

/* ----------------------------------------------------------------- tile -- */

describe("tile", () => {
  it("computes tiles and boxes for a 10 × 8 floor", () => {
    const result = run("tile-calculator", {
      length: 10,
      width: 8,
      tileLength: 12,
      tileWidth: 12,
      waste: 10,
      sqFtPerBox: 15,
    });
    // 80 sq ft, 1 sq ft tiles → 80 before waste, ⌈88⌉ = 88 after
    expect(summaryValue(result, "Area to tile")).toBe(80);
    expect(summaryValue(result, "Tiles before waste")).toBe(80);
    expect(summaryValue(result, "Tiles to buy")).toBe(88);
    expect(summaryValue(result, "Boxes")).toBe(6); // ⌈88 / 15⌉
  });

  it("scales tile count with tile size", () => {
    const small = run("tile-calculator", { tileLength: 6, tileWidth: 6 });
    const large = run("tile-calculator", { tileLength: 24, tileWidth: 24 });
    expect(summaryValue(small, "Tiles to buy")).toBeGreaterThan(
      summaryValue(large, "Tiles to buy"),
    );
  });

  it("uses more grout for narrower tiles", () => {
    const small = run("tile-calculator", { tileLength: 4, tileWidth: 4 });
    const large = run("tile-calculator", { tileLength: 24, tileWidth: 24 });
    expect(material(small, "grout").quantity).toBeGreaterThanOrEqual(
      material(large, "grout").quantity,
    );
  });
});

/* ----------------------------------------------------------------- deck -- */

describe("deck", () => {
  it("computes decking rows and linear feet", () => {
    const result = run("deck-calculator", {
      length: 16,
      width: 12,
      boardWidth: 5.5,
      boardGap: 0.25,
      joistSpacing: 16,
      waste: 0,
      includeRailing: false,
      includeStairs: false,
    });
    // Pitch = 5.75 in = 0.47917 ft → ⌈16 / 0.47917⌉ = 34 rows × 12 ft = 408 ft
    expect(summaryValue(result, "Deck area")).toBe(192);
    expect(summaryValue(result, "Decking rows")).toBe(34);
    expect(summaryValue(result, "Decking needed")).toBe(408);
    // ⌊16 / (16/12)⌋ + 1 = 13 joists
    expect(summaryValue(result, "Joists")).toBe(13);
  });

  it("omits railing when it is turned off", () => {
    const result = run("deck-calculator", { includeRailing: false });
    expect(result.materials.some((line) => line.id === "railing")).toBe(false);
  });

  it("always warns about structural verification", () => {
    const result = run("deck-calculator");
    expect(result.warnings.join(" ")).toMatch(/structural/i);
  });
});

/* ------------------------------------------------------------------ sod -- */

describe("sod", () => {
  it("computes rolls and pallets", () => {
    const result = run("sod-calculator", {
      length: 50,
      width: 30,
      length2: 0,
      width2: 0,
      diameter: 0,
      extraArea: 0,
      waste: 5,
      rollCoverage: 10,
      palletCoverage: 450,
    });
    // 1500 sq ft × 1.05 = 1575 → 158 rolls, 4 pallets
    expect(summaryValue(result, "Lawn area")).toBe(1500);
    expect(summaryValue(result, "Rolls")).toBe(158);
    expect(summaryValue(result, "Pallets")).toBe(4);
  });

  it("adds circular and extra sections", () => {
    const result = run("sod-calculator", {
      length: 10,
      width: 10,
      diameter: 10,
      extraArea: 50,
      waste: 0,
    });
    expect(summaryValue(result, "Lawn area")).toBeCloseTo(100 + Math.PI * 25 + 50, 4);
  });
});

/* --------------------------------------------------------- cross-cutting -- */

describe("every project", () => {
  it("produces a finite, non-negative result from its defaults", () => {
    for (const project of projects) {
      const result = run(project.slug);
      expect(Number.isFinite(result.headline.value)).toBe(true);
      expect(result.headline.value).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.costTotal)).toBe(true);
      expect(result.costTotal).toBeGreaterThanOrEqual(0);

      for (const row of result.summary) {
        expect(Number.isFinite(row.value), `${project.slug} / ${row.label}`).toBe(true);
      }
      for (const line of result.materials) {
        expect(Number.isFinite(line.quantity), `${project.slug} / ${line.id}`).toBe(true);
        expect(line.quantity).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("has a headline, materials, steps, FAQs, and related projects", () => {
    for (const project of projects) {
      const result = run(project.slug);
      expect(result.headline.label.length).toBeGreaterThan(0);
      expect(result.materials.length).toBeGreaterThan(0);
      expect(result.explanation.length).toBeGreaterThan(0);
      expect(result.formulas.length).toBeGreaterThan(0);
      expect(project.steps.length).toBeGreaterThan(3);
      expect(project.faq.length).toBeGreaterThan(1);
      expect(project.related.length).toBeGreaterThan(0);
    }
  });

  it("produces identical canonical results in metric", () => {
    for (const project of projects) {
      const us = run(project.slug, {}, "us");
      const metric = run(project.slug, {}, "metric");
      // Defaults are defined canonically, so both systems must agree.
      expect(metric.headline.value, project.slug).toBeCloseTo(us.headline.value, 4);
    }
  });

  it("scales cost with waste", () => {
    for (const project of projects) {
      const noWaste = run(project.slug, { waste: 0 });
      const heavyWaste = run(project.slug, { waste: 25 });
      expect(heavyWaste.costTotal, project.slug).toBeGreaterThanOrEqual(noWaste.costTotal);
    }
  });
});
