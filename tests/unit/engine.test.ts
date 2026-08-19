import { describe, expect, it } from "vitest";
import { getProjectOrThrow } from "@/data/projects";
import {
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

  it("leaves prices and percentages alone", () => {
    const us = defaultValues(concrete, "us");
    const metric = convertValues(concrete, us, "us", "metric");
    expect(metric.waste).toBe(us.waste);
    expect(metric.concretePrice).toBe(us.concretePrice);
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
