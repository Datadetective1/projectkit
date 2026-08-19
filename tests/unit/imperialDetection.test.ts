import { describe, expect, it } from "vitest";
import { IMPERIAL_UNIT, productSpecExemption } from "../support/imperialUnits";

/**
 * The detector that gates metric output, tested against the strings that
 * actually broke it.
 *
 * Both failure directions matter. Missing a leak lets a wrong unit reach a
 * reader; flagging a false one buries the real findings — an early version
 * matched "foot" inside "footing" and reported every deck warning about
 * footing sizes as a unit bug.
 */

function leaks(text: string): boolean {
  return IMPERIAL_UNIT.test(text) && !productSpecExemption(text);
}

describe("imperial unit detection", () => {
  it("catches a unit beside a converted number", () => {
    for (const text of [
      "A 111 m² bed at 3 in deep needs 8.50 m³ of mulch.",
      "6 in and 12 in taping knives",
      "Covers 608 sq ft.",
      "24 linear ft",
      "$165.00 per yd³",
      "Cheaper per yard once you need more than about a yard.",
      "A cubic yard is roughly nine to fourteen wheelbarrow loads.",
      "350 sq ft per gallon",
      "Rounded up to the next quart",
    ]) {
      expect(leaks(text), text).toBe(true);
    }
  });

  it("leaves product specifications alone", () => {
    // Each of these is how you find the thing on a shelf.
    for (const text of [
      "Drywall sheets (4 × 8 ft)",
      "Thinset mortar (50 lb)",
      "Joint compound (4.5 gal)",
      "Joint tape (250 ft)",
      "Bag size: 2 cu ft",
      "2 cu ft",
      "Bag yield: 0.45 cu ft per bag",
      "About 70 m² per bag with a 1/4 × 3/8 in notch",
    ]) {
      expect(leaks(text), text).toBe(false);
      expect(productSpecExemption(text)?.why, text).toBeTruthy();
    }
  });

  it("does not fire on words that merely contain a unit", () => {
    /*
     * Every one of these was a real false positive at some point: "foot" inside
     * "footing", "quart" inside "Quarter", "ton" inside "tonnage", "yard"
     * inside the "Yard & Garden" category, and "in" as an ordinary preposition.
     */
    for (const text of [
      "Structural requirements, footing sizes, spans, loads, permits",
      "Quarter round / shoe moulding",
      "Treat the tonnage as an approximation",
      "Yard & Garden · Easy · A full day",
      "Bulk works out to about $494 versus $711 in bags",
      "Beams, posts, and footings are deliberately not quantified here.",
    ]) {
      expect(leaks(text), text).toBe(false);
    }
  });

  it("does not fire on metric output", () => {
    for (const text of [
      "A 111 m² bed at 7.6 cm deep needs 8.50 m³ of mulch.",
      "$215.81 per m³",
      "8.59 m² per litre",
      "24 linear m",
      "1,602 kg per cubic metre",
      "7.57 L of paint",
    ]) {
      expect(leaks(text), text).toBe(false);
    }
  });
});
