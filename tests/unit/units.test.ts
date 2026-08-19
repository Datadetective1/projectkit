import { describe, expect, it } from "vitest";
import {
  formatNumber,
  formatQuantity,
  fromCanonical,
  roundTo,
  roundUpTo,
  rateLabel,
  rateScale,
  toCanonical,
  unitLabel,
} from "@/lib/units";

describe("unit conversion", () => {
  it("round-trips every measure without drift", () => {
    const measures = [
      "length",
      "inch",
      "area",
      "volumeFt",
      "volumeYd",
      "weight",
    ] as const;

    for (const measure of measures) {
      for (const value of [0.5, 1, 12.75, 320, 5000]) {
        const metric = fromCanonical(value, measure, "metric");
        const back = toCanonical(metric, measure, "metric");
        expect(back).toBeCloseTo(value, 8);
      }
    }
  });

  it("leaves US values untouched", () => {
    expect(toCanonical(20, "length", "us")).toBe(20);
    expect(fromCanonical(20, "length", "us")).toBe(20);
  });

  it("converts known reference values", () => {
    expect(fromCanonical(1, "length", "metric")).toBeCloseTo(0.3048, 6);
    expect(fromCanonical(1, "inch", "metric")).toBeCloseTo(2.54, 6);
    expect(fromCanonical(1, "area", "metric")).toBeCloseTo(0.09290304, 8);
    expect(fromCanonical(1, "volumeYd", "metric")).toBeCloseTo(0.7645549, 6);
    expect(fromCanonical(1, "weight", "metric")).toBeCloseTo(0.9071847, 6);
  });

  it("never converts percentages, currency, or counts", () => {
    expect(fromCanonical(10, "percent", "metric")).toBe(10);
    expect(fromCanonical(42.5, "currency", "metric")).toBe(42.5);
    expect(fromCanonical(7, "count", "metric")).toBe(7);
  });

  it("labels units per system", () => {
    expect(unitLabel("length", "us")).toBe("ft");
    expect(unitLabel("length", "metric")).toBe("m");
    expect(unitLabel("volumeYd", "us")).toBe("yd³");
    expect(unitLabel("volumeYd", "metric")).toBe("m³");
  });
});

describe("rounding", () => {
  it("rounds to decimals predictably", () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
    expect(roundTo(2.005, 2)).toBe(2.01);
    expect(roundTo(-0, 2)).toBe(0);
  });

  it("rounds up to a purchase increment", () => {
    expect(roundUpTo(4.35, 0.25)).toBe(4.5);
    expect(roundUpTo(4.5, 0.25)).toBe(4.5);
    expect(roundUpTo(0.01, 0.25)).toBe(0.25);
    expect(roundUpTo(0, 0.25)).toBe(0);
  });

  it("returns the value unchanged for a zero step", () => {
    expect(roundUpTo(4.35, 0)).toBe(4.35);
  });

  it("never emits NaN or Infinity", () => {
    expect(roundTo(Number.NaN, 2)).toBe(0);
    expect(roundUpTo(Number.POSITIVE_INFINITY, 0.25)).toBe(0);
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatting", () => {
  it("drops trailing zeros on whole numbers", () => {
    expect(formatNumber(320, 2)).toBe("320");
    expect(formatNumber(4.5, 2)).toBe("4.50");
  });

  it("formats quantities with the active system's unit", () => {
    expect(formatQuantity(320, "area", { system: "us", precision: 0 })).toBe("320 sq ft");
    expect(formatQuantity(1, "length", { system: "metric", precision: 2 })).toBe("0.30 m");
    expect(formatQuantity(12, "count", { system: "us", unitOverride: "bags" })).toBe("12 bags");
    expect(formatQuantity(10, "percent", { system: "us" })).toBe("10%");
  });

  it("singularises counted units at exactly one", () => {
    const one = (unitOverride: string) =>
      formatQuantity(1, "count", { system: "us", unitOverride });

    expect(one("bags")).toBe("1 bag");
    expect(one("boxes")).toBe("1 box");
    expect(one("bunches")).toBe("1 bunch");
    // Only the leading word changes, so parentheticals survive intact.
    expect(one("boxes (5 lb)")).toBe("1 box (5 lb)");
    expect(one("boxes of tile")).toBe("1 box of tile");
    // Already singular, or not a plural at all.
    expect(one("bag")).toBe("1 bag");
    expect(one("truss")).toBe("1 truss");
  });

  it("translates the unit inside a custom label", () => {
    // The value is always converted. A hardcoded imperial label therefore
    // mislabels it: form boards read "24 linear ft" in metric when the real
    // figure was 79 ft and 24 was the metre count.
    expect(formatQuantity(79, "length", { system: "us", unitOverride: "linear ft" })).toBe(
      "79 linear ft",
    );
    expect(
      formatQuantity(79, "length", { system: "metric", unitOverride: "linear ft", precision: 0 }),
    ).toBe("24 linear m");

    // Surrounding words survive.
    expect(
      formatQuantity(449, "length", {
        system: "metric",
        unitOverride: "linear ft of decking",
        precision: 0,
      }),
    ).toBe("137 linear m of decking");
    expect(
      formatQuantity(15, "area", { system: "metric", unitOverride: "sq ft / box", precision: 2 }),
    ).toBe("1.39 m² / box");
  });

  it("leaves a label that names no unit untouched", () => {
    for (const label of ["bags", "boxes (5 lb)", "posts", "sheets"]) {
      expect(formatQuantity(12, "count", { system: "metric", unitOverride: label })).toBe(
        `12 ${label}`,
      );
    }
  });

  it("leaves measured units alone — '1 sq ft' is already correct", () => {
    expect(formatQuantity(1, "area", { system: "us", precision: 0 })).toBe("1 sq ft");
    expect(formatQuantity(1, "count", { system: "us", unitOverride: "linear ft" })).toBe(
      "1 linear ft",
    );
    expect(formatQuantity(2, "count", { system: "us", unitOverride: "bags" })).toBe("2 bags");
  });
});

describe("rates", () => {
  /**
   * A rate is a quantity per another quantity: "$ / yd³", "sq ft / gal". Both
   * halves convert, and the denominator moves the value the *other* way.
   * Getting that backwards is a 31% error on concrete pricing and a 4× error on
   * paint coverage, both displayed as confident numbers.
   */

  it("scales a price up when the denominator gets bigger", () => {
    // A cubic metre is more concrete than a cubic yard, so it costs more.
    // display = canonical × scale, so the scale is above 1 here.
    const scale = rateScale("currency", "volumeYd", "metric");
    expect(165 * scale).toBeCloseTo(215.81, 1);
    expect(rateScale("currency", "volumeYd", "us")).toBe(1);
  });

  it("inverts coverage rather than converting the numerator alone", () => {
    // 350 sq ft per US gallon is 8.59 m² per litre. Converting only the area
    // gives 32.5, which is four times too generous.
    const metric = 350 * rateScale("area", "volumeLiquid", "metric");
    expect(metric).toBeCloseTo(8.59, 2);
    expect(metric).not.toBeCloseTo(32.5, 1);
  });

  it("is exactly reversible", () => {
    for (const [measure, per] of [
      ["currency", "volumeYd"],
      ["currency", "area"],
      ["currency", "length"],
      ["currency", "weight"],
      ["currency", "volumeLiquid"],
      ["area", "volumeLiquid"],
    ] as const) {
      const there = rateScale(measure, per, "metric");
      expect(100 * there * (1 / there), `${measure}/${per}`).toBeCloseTo(100, 9);
    }
  });

  it("names both halves in the reader's system", () => {
    expect(rateLabel("currency", "volumeYd", "us")).toBe("$ / yd³");
    expect(rateLabel("currency", "volumeYd", "metric")).toBe("$ / m³");
    expect(rateLabel("area", "volumeLiquid", "us")).toBe("sq ft / gal");
    expect(rateLabel("area", "volumeLiquid", "metric")).toBe("m² / L");
    expect(rateLabel("currency", "length", "metric")).toBe("$ / m");
    // Singular denominator: it is a price per one of something.
    expect(rateLabel("currency", "weight", "us")).toBe("$ / ton");
  });

  it("falls back to the plain unit when there is no denominator", () => {
    expect(rateLabel("area", undefined, "us")).toBe("sq ft");
    expect(rateLabel("currency", undefined, "us")).toBe("$");
    expect(rateScale("area", undefined, "metric")).toBeCloseTo(0.0929, 4);
  });
});
