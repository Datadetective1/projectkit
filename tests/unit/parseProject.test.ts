import { describe, expect, it } from "vitest";
import { parseWithRules } from "@/lib/ai/parseProject";

function parse(input: string) {
  const result = parseWithRules(input);
  return result.parsed;
}

describe("project detection", () => {
  const cases: [string, string][] = [
    ["I want to build a 20 by 16 concrete patio", "concrete-calculator"],
    ["I need a 6 foot privacy fence around my backyard", "fence-calculator"],
    ["I want to repaint three bedrooms", "paint-calculator"],
    ["I need mulch for a 1,200 sq ft flower bed", "mulch-calculator"],
    ["laying vinyl plank flooring in a 15x12 room", "flooring-calculator"],
    ["gravel driveway 40 by 12", "gravel-calculator"],
    ["hang drywall in a 14 x 12 basement room", "drywall-calculator"],
    ["tile a 10 by 8 bathroom floor", "tile-calculator"],
    ["build a 16x12 deck", "deck-calculator"],
    ["new sod for a 50 by 30 lawn", "sod-calculator"],
  ];

  it.each(cases)("routes %j to %s", (input, slug) => {
    expect(parse(input)?.slug).toBe(slug);
  });

  it("returns nothing for an unrelated request", () => {
    expect(parse("what is the weather tomorrow")).toBeUndefined();
    expect(parse("")).toBeUndefined();
  });
});

describe("dimension extraction", () => {
  it("reads 'by', 'x', and '×' the same way", () => {
    for (const separator of ["by", "x", "×", "X"]) {
      const parsed = parse(`concrete patio 20 ${separator} 16`);
      expect(parsed?.fields.length).toBe("20");
      expect(parsed?.fields.width).toBe("16");
    }
  });

  it("handles decimals and unit suffixes", () => {
    const parsed = parse("concrete slab 20.5 ft x 16 ft");
    expect(parsed?.fields.length).toBe("20.5");
    expect(parsed?.fields.width).toBe("16");
  });

  it("reads slab thickness in inches", () => {
    const parsed = parse("concrete patio 20 by 16, 6 inches thick");
    expect(parsed?.fields.thickness).toBe("6");
  });

  it("reads square footage with a comma", () => {
    const parsed = parse("mulch for a 1,200 sq ft bed");
    expect(parsed?.fields.area).toBe("1200");
    expect(parsed?.fields.shape).toBe("custom");
  });

  it("reads mulch depth", () => {
    const parsed = parse("mulch for a 400 square foot bed 4 inches deep");
    expect(parsed?.fields.depth).toBe("4");
  });
});

describe("fence specifics", () => {
  it("extracts height, gates, and layout", () => {
    const parsed = parse(
      "I need a 6-foot privacy fence around a 75 by 110 backyard with one gate",
    );
    expect(parsed?.slug).toBe("fence-calculator");
    expect(parsed?.fields.layout).toBe("rectangle");
    expect(parsed?.fields.length).toBe("75");
    expect(parsed?.fields.width).toBe("110");
    expect(parsed?.fields.height).toBe("6");
    expect(parsed?.fields.gateCount).toBe("1");
    expect(parsed?.fields.picketGap).toBe("0");
  });

  it("handles a straight run given in linear feet", () => {
    const parsed = parse("120 ft of fence, 4 feet tall");
    expect(parsed?.fields.layout).toBe("straight");
    expect(parsed?.fields.runLength).toBe("120");
  });

  it("reads a numeric gate count", () => {
    const parsed = parse("privacy fence 50 by 50 with 2 gates");
    expect(parsed?.fields.gateCount).toBe("2");
  });
});

describe("paint specifics", () => {
  it("counts bedrooms written as a word", () => {
    const parsed = parse("I want to repaint three bedrooms");
    expect(parsed?.fields.rooms).toBe("3");
  });

  it("turns the ceiling on when mentioned", () => {
    const parsed = parse("paint a 12 by 14 room including the ceiling");
    expect(parsed?.fields.includeCeiling).toBe("true");
  });
});

describe("tile specifics", () => {
  it("reads tile dimensions separately from room dimensions", () => {
    const parsed = parse("tile a 10 by 8 floor with 12x12 tiles");
    expect(parsed?.slug).toBe("tile-calculator");
    expect(parsed?.fields.tileLength).toBe("12");
    expect(parsed?.fields.tileWidth).toBe("12");
  });
});

describe("confidence", () => {
  it("is high when several values are found", () => {
    expect(parse("concrete patio 20 by 16 4 inches thick")?.confidence).toBe("high");
  });

  it("is low when only the project is known", () => {
    expect(parse("I want to pour some concrete")?.confidence).toBe("low");
  });
});

describe("ambiguity", () => {
  it("takes the first project mentioned and offers the rest", () => {
    const result = parseWithRules("a concrete patio and then a fence around it");
    expect(result.parsed?.slug).toBe("concrete-calculator");
    expect(result.candidates).toContain("fence-calculator");
  });
});

describe("robustness", () => {
  it("never throws on hostile input", () => {
    const inputs = [
      "((((",
      "concrete " + "9".repeat(500),
      "<script>alert(1)</script> concrete 10x10",
      "concrete -20 by -16",
      "concrete 0 by 0",
      "🙂🙂🙂 concrete patio",
    ];
    for (const input of inputs) {
      expect(() => parseWithRules(input)).not.toThrow();
    }
  });

  it("never emits a negative or zero dimension", () => {
    const parsed = parse("concrete patio 0 by 0");
    if (parsed?.fields.length) expect(Number(parsed.fields.length)).toBeGreaterThan(0);
  });
});
