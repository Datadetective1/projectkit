import { describe, expect, it } from "vitest";
import { getProjectOrThrow } from "@/data/projects";
import type { UnitSystem } from "@/lib/units";
import {
  anchorsFor,
  applyPrefill,
  convertValues,
  defaultValues,
  evaluate,
  toQueryParams,
  validate,
  visibleInputs,
} from "@/lib/calc/engine";

const concrete = getProjectOrThrow("concrete-calculator");
const mulch = getProjectOrThrow("mulch-calculator");
const paint = getProjectOrThrow("paint-calculator");

describe("defaults", () => {
  it("fills every input", () => {
    const values = defaultValues(concrete, "us");
    for (const input of concrete.inputs) {
      expect(values[input.id], input.id).toBeDefined();
    }
  });

  it("converts numeric defaults into the display system", () => {
    const metric = defaultValues(concrete, "metric");
    expect(Number(metric.length)).toBeCloseTo(6.096, 3);
    expect(Number(metric.thickness)).toBeCloseTo(10.16, 3);
    // Percentages and prices stay put.
    expect(metric.waste).toBe(10);
  });
});

describe("validation", () => {
  const base = defaultValues(concrete, "us");

  it("accepts sensible values", () => {
    expect(validate(concrete, base, "us")).toEqual({});
  });

  it("rejects blank required fields", () => {
    const errors = validate(concrete, { ...base, length: "" }, "us");
    expect(errors.length).toMatch(/enter a number/i);
  });

  it("rejects negatives", () => {
    const errors = validate(concrete, { ...base, width: -5 }, "us");
    expect(errors.width).toMatch(/zero or more/i);
  });

  it("rejects zero on fields that require a positive value", () => {
    const errors = validate(concrete, { ...base, length: 0 }, "us");
    expect(errors.length).toMatch(/greater than zero/i);
  });

  it("allows zero where zero is meaningful", () => {
    const errors = validate(concrete, { ...base, waste: 0, baseDepth: 0 }, "us");
    expect(errors.waste).toBeUndefined();
    expect(errors.baseDepth).toBeUndefined();
  });

  it("rejects text and non-finite values", () => {
    expect(validate(concrete, { ...base, length: "abc" }, "us").length).toBeTruthy();
    expect(validate(concrete, { ...base, length: Number.NaN }, "us").length).toBeTruthy();
    expect(validate(concrete, { ...base, length: Number.POSITIVE_INFINITY }, "us").length).toBeTruthy();
  });

  it("rejects values outside the defined bounds", () => {
    expect(validate(concrete, { ...base, thickness: 100 }, "us").thickness).toMatch(/or less/i);
    expect(validate(concrete, { ...base, thickness: 0.5 }, "us").thickness).toMatch(/at least/i);
  });

  it("flags unrealistic dimensions", () => {
    expect(validate(concrete, { ...base, length: 6000 }, "us").length).toBeTruthy();
  });

  it("ignores hidden fields", () => {
    // gravelPrice is hidden when baseDepth is 0, so a bad value must not block.
    const errors = validate(concrete, { ...base, baseDepth: 0, gravelPrice: -99 }, "us");
    expect(errors.gravelPrice).toBeUndefined();
  });

  it("bounds are converted for metric messages", () => {
    const metricBase = defaultValues(concrete, "metric");
    const errors = validate(concrete, { ...metricBase, thickness: 999 }, "metric");
    expect(errors.thickness).toMatch(/cm/);
  });
});

describe("evaluate", () => {
  it("refuses to run with invalid input", () => {
    const values = { ...defaultValues(concrete, "us"), length: -1 };
    const result = evaluate(concrete, values, "us");
    expect(result.ok).toBe(false);
  });

  it("never lets NaN reach the result", () => {
    const values = { ...defaultValues(concrete, "us") };
    const result = evaluate(concrete, values, "us");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const numbers = [
      result.result.headline.value,
      result.result.costTotal,
      ...result.result.summary.map((row) => row.value),
      ...result.result.materials.map((line) => line.quantity),
    ];
    for (const value of numbers) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe("unit switching", () => {
  it("round-trips without corrupting values", () => {
    const us = defaultValues(concrete, "us");
    const metric = convertValues(concrete, us, "us", "metric");
    const back = convertValues(concrete, metric, "metric", "us");

    expect(Number(back.length)).toBeCloseTo(Number(us.length), 2);
    expect(Number(back.width)).toBeCloseTo(Number(us.width), 2);
    expect(Number(back.thickness)).toBeCloseTo(Number(us.thickness), 2);
  });

  it("leaves percentages and per-package prices alone", () => {
    const us = defaultValues(concrete, "us");
    const metric = convertValues(concrete, us, "us", "metric");

    expect(metric.waste).toBe(us.waste);
    // A bag is a bag in both systems, so its price is the same number.
    expect(metric.bagPrice).toBe(us.bagPrice);
  });

  it("converts a price that is quoted per unit of measure", () => {
    /*
     * This asserts the opposite of what it used to. Ready-mix is priced per
     * cubic yard, and the old behaviour left the number at 165 while the field
     * beside it converted to cubic metres — so a metric user was asked for a
     * per-m³ price and shown a per-yd³ one, a 31% understatement they had no
     * way to notice.
     */
    const us = defaultValues(concrete, "us");
    const metric = convertValues(concrete, us, "us", "metric");

    expect(Number(metric.concretePrice)).toBeCloseTo(Number(us.concretePrice) / 0.764554857984, 2);
    // The price per cubic metre must be the larger number — a cubic metre is
    // more concrete than a cubic yard.
    expect(Number(metric.concretePrice)).toBeGreaterThan(Number(us.concretePrice));
  });

  it("round-trips a rate without drift", () => {
    const us = defaultValues(concrete, "us");
    const metric = convertValues(concrete, us, "us", "metric");
    const back = convertValues(concrete, metric, "metric", "us");

    expect(Number(back.concretePrice)).toBeCloseTo(Number(us.concretePrice), 2);
    expect(Number(back.gravelPrice)).toBeCloseTo(Number(us.gravelPrice), 2);
  });

  it("inverts coverage, which is an area per unit of liquid", () => {
    /*
     * The trap: converting the area alone gives 32.5 m² per gallon, which is
     * four times the truth. 350 sq ft per US gallon is 8.59 m² per litre.
     */
    const paintDefaults = defaultValues(paint, "us");
    const metric = convertValues(paint, paintDefaults, "us", "metric");

    expect(Number(paintDefaults.coverage)).toBe(350);
    expect(Number(metric.coverage)).toBeCloseTo(8.59, 1);
  });

  it("preserves select and toggle values", () => {
    const us = defaultValues(mulch, "us");
    const metric = convertValues(mulch, us, "us", "metric");
    expect(metric.shape).toBe(us.shape);
  });

  it("is a no-op when the system is unchanged", () => {
    const us = defaultValues(concrete, "us");
    expect(convertValues(concrete, us, "us", "us")).toEqual(us);
  });

  it("skips blank fields rather than turning them into zero", () => {
    const values = { ...defaultValues(concrete, "us"), length: "" };
    const metric = convertValues(concrete, values, "us", "metric");
    expect(metric.length).toBe("");
  });

  it("drifts without an anchor, because display values are rounded", () => {
    const us = { ...defaultValues(concrete, "us"), length: 20 };
    const metric = convertValues(concrete, us, "us", "metric");
    expect(metric.length).toBe(6.096);

    const back = convertValues(concrete, metric, "metric", "us");
    // 4.877 m is not exactly 16 ft — this is the drift anchors exist to remove.
    expect(Number(back.width)).not.toBe(16);
  });

  it("returns the exact entered value when anchored", () => {
    const us = { ...defaultValues(concrete, "us"), length: 20, width: 16 };
    const anchors = anchorsFor(concrete, us, "us");

    const metric = convertValues(concrete, us, "us", "metric", anchors);
    const back = convertValues(concrete, metric, "metric", "us", anchors);

    expect(back.length).toBe(20);
    expect(back.width).toBe(16);
  });

  it("stays exact over repeated switching", () => {
    const anchors = anchorsFor(concrete, { ...defaultValues(concrete, "us") }, "us");
    let values = { ...defaultValues(concrete, "us") };
    let system: UnitSystem = "us";

    for (let i = 0; i < 10; i += 1) {
      const next: UnitSystem = system === "us" ? "metric" : "us";
      values = convertValues(concrete, values, system, next, anchors);
      system = next;
    }

    expect(system).toBe("us");
    expect(values.length).toBe(20);
    expect(values.width).toBe(16);
    expect(values.thickness).toBe(4);
  });

  it("ignores a stale anchor when the field has since been edited", () => {
    const us = { ...defaultValues(concrete, "us"), length: 20 };
    const anchors = anchorsFor(concrete, us, "us");

    // The user typed a new length after the anchor was taken.
    const edited = { ...us, length: 30 };
    const metric = convertValues(concrete, edited, "us", "metric", anchors);

    expect(Number(metric.length)).toBeCloseTo(9.144, 3);
  });
});

describe("prefill", () => {
  const base = defaultValues(concrete, "us");

  it("applies valid parameters", () => {
    const { values, applied } = applyPrefill(concrete, base, { length: "20", width: "16" });
    expect(values.length).toBe(20);
    expect(values.width).toBe(16);
    expect(applied).toEqual(["length", "width"]);
  });

  it("ignores malformed, negative, and unknown parameters", () => {
    const { values, applied } = applyPrefill(concrete, base, {
      length: "not-a-number",
      width: "-4",
      nonsense: "42",
    });
    expect(values.length).toBe(base.length);
    expect(values.width).toBe(base.width);
    expect(applied).toEqual([]);
  });

  it("only accepts known select options", () => {
    const good = applyPrefill(concrete, base, { reinforcement: "rebar" });
    expect(good.values.reinforcement).toBe("rebar");

    const bad = applyPrefill(concrete, base, { reinforcement: "adamantium" });
    expect(bad.values.reinforcement).toBe(base.reinforcement);
  });

  it("only accepts boolean strings for toggles", () => {
    const drywall = getProjectOrThrow("drywall-calculator");
    const drywallBase = defaultValues(drywall, "us");
    expect(applyPrefill(drywall, drywallBase, { includeCeiling: "false" }).values.includeCeiling).toBe(false);
    expect(applyPrefill(drywall, drywallBase, { includeCeiling: "maybe" }).values.includeCeiling).toBe(
      drywallBase.includeCeiling,
    );
  });
});

describe("share links", () => {
  it("omits defaults and keeps changes", () => {
    const base = defaultValues(concrete, "us");
    const params = toQueryParams(concrete, { ...base, length: 30 }, "us");
    expect(params.get("length")).toBe("30");
    expect(params.get("width")).toBeNull();
  });

  it("records a non-default unit system", () => {
    const base = defaultValues(concrete, "metric");
    const params = toQueryParams(concrete, base, "metric");
    expect(params.get("units")).toBe("metric");
  });
});

describe("conditional inputs", () => {
  it("hides the circle diameter unless the shape is a circle", () => {
    const rect = visibleInputs(mulch, { ...defaultValues(mulch, "us"), shape: "rectangle" });
    expect(rect.some((input) => input.id === "diameter")).toBe(false);

    const circle = visibleInputs(mulch, { ...defaultValues(mulch, "us"), shape: "circle" });
    expect(circle.some((input) => input.id === "diameter")).toBe(true);
  });
});
