import {
  formatCurrency,
  formatNumber,
  formatQuantity,
  fromCanonical,
  unitLabel,
  unitName,
  type Measure,
  type UnitSystem,
} from "@/lib/units";

/**
 * Prose formatters for calculation output.
 *
 * Every calculator writes explanations, notes, and assumption rows in ordinary
 * sentences. Before this module each one interpolated `roundTo(value, n)` next
 * to a hardcoded unit word, which meant a metric reader was told "a 111 m² bed
 * at 3 in deep" — the value converted, the unit did not. There were roughly
 * sixty of those.
 *
 * The rule this replaces it with: **a number in prose never appears without
 * going through one of these.** A calculator should not be able to write a unit
 * name at all.
 *
 * `describeFor(system)` returns the whole set bound to one unit system, so a
 * calculator destructures it once and the system is impossible to forget at an
 * individual call site.
 *
 * What deliberately stays imperial: package and product specifications. A 50 lb
 * bag of thinset, a 4 × 8 ft sheet, a 1/4 × 3/8 in trowel, and a 250 ft roll of
 * tape are how you find the thing on a shelf, and a metric reader looking for
 * them is better served by the name on the packaging than by a conversion. Use
 * `productSpec()` to mark those, so they read as a deliberate choice rather
 * than a missed conversion.
 */

export interface Describe {
  /** A length: "16 ft" / "4.88 m". */
  length: (value: number, precision?: number) => string;
  /** A small dimension held in inches: "4 in" / "10.16 cm". */
  inch: (value: number, precision?: number) => string;
  /** An area: "320 sq ft" / "30 m²". */
  area: (value: number, precision?: number) => string;
  /** A bulk volume in cubic feet: "43.3 cu ft" / "1.23 m³". */
  volumeFt: (value: number, precision?: number) => string;
  /** A bulk volume ordered in yards: "4.50 yd³" / "3.44 m³". */
  volumeYd: (value: number, precision?: number) => string;
  /** A liquid volume: "2 gal" / "7.57 L". */
  liquid: (value: number, precision?: number) => string;
  /** A weight: "8.80 tons" / "7.98 t". */
  weight: (value: number, precision?: number) => string;
  /**
   * A small mass held in pounds: "5 lb" / "2.27 kg". Distinct from `weight`,
   * which handles bulk tonnage — a compound allowance or a grout quantity is
   * kilograms in metric, not tonnes.
   */
  mass: (pounds: number, precision?: number) => string;
  /** Coverage, as "350 sq ft per gallon" / "8.59 m² per litre". */
  coveragePerLiquid: (areaPerGallon: number, precision?: number) => string;
  /**
   * A price per unit of measure: "$165.00 per yd³" / "$215.81 per m³".
   *
   * Prices are held per *canonical* unit, so this has to rescale as well as
   * relabel. Printed raw beside a converted quantity the arithmetic stops
   * working — "3.40 m³ · $165.00 per yd³ · $734" invites the reader to
   * multiply 3.40 by 165 and conclude the total is broken. Mirrors
   * `formatUnitPrice` in lib/format.ts, which does the same job for the
   * materials table.
   */
  pricePerUnit: (canonicalPrice: number, measure: Measure) => string;
  /** The spoken name of a unit, for sentences like "sold by the cubic yard". */
  unitName: (measure: Measure) => string;
  /**
   * A package or product specification, left in the units it is sold under.
   * Marks the choice as deliberate — see the module docblock.
   */
  productSpec: (text: string) => string;
  /** The system these formatters are bound to. */
  system: UnitSystem;
}

export function describeFor(system: UnitSystem): Describe {
  const of =
    (measure: Measure, fallbackPrecision?: number) =>
    (value: number, precision = fallbackPrecision) =>
      formatQuantity(value, measure, { system, precision });

  return {
    length: of("length", 1),
    inch: of("inch", 1),
    area: of("area", 0),
    volumeFt: of("volumeFt", 2),
    volumeYd: of("volumeYd", 2),
    liquid: of("volumeLiquid", 2),
    weight: of("weight", 2),

    mass: (pounds, precision) => {
      const value = system === "us" ? pounds : pounds * 0.45359237;
      const decimals = precision ?? (Number.isInteger(value) ? 0 : 2);
      return `${formatNumber(value, decimals)} ${system === "us" ? "lb" : "kg"}`;
    },

    /*
     * Coverage inverts under conversion. 350 sq ft per US gallon is 8.59 m² per
     * litre — you cannot convert the area and leave the gallon alone, which is
     * exactly the mistake this exists to prevent.
     */
    coveragePerLiquid: (areaPerGallon, precision) => {
      const perDisplayLiquid =
        formatQuantity(1, "volumeLiquid", { system, precision: 6 });
      const gallonsPerDisplayUnit = Number(perDisplayLiquid.replace(/[^\d.]/g, "")) || 1;
      const converted = areaPerGallon / gallonsPerDisplayUnit;
      const area = formatQuantity(converted, "area", {
        system,
        precision: precision ?? (system === "us" ? 0 : 2),
      });
      return `${area} per ${system === "us" ? "gallon" : "litre"}`;
    },

    pricePerUnit: (canonicalPrice, measure) => {
      // One canonical unit is `perDisplayUnit` display units, so the price per
      // display unit is the canonical price divided by it.
      const perDisplayUnit = fromCanonical(1, measure, system);
      const price = perDisplayUnit > 0 ? canonicalPrice / perDisplayUnit : canonicalPrice;
      return `${formatCurrency(price)} per ${unitLabel(measure, system)}`;
    },

    unitName: (measure) => unitName(measure, system),
    productSpec: (text) => text,
    system,
  };
}
