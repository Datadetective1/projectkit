import { describe, expect, it } from "vitest";
import {
  formatNumber,
  formatQuantity,
  fromCanonical,
  roundTo,
  roundUpTo,
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
});
