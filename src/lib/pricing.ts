/**
 * Planning price book.
 *
 * These are national-ballpark planning assumptions, not live retail prices.
 * Every one of them is surfaced to the user as an editable input on the project
 * that uses it, so nobody is stuck with our number.
 *
 * Extension point: `getPriceBook()` takes an optional region key today and
 * always returns the defaults. Regional/live pricing can be layered in later
 * without touching a single calculation.
 */

export interface PriceBook {
  /** Concrete */
  concretePerCubicYard: number;
  concreteBag60lb: number;
  concreteBag80lb: number;
  /** Aggregates */
  gravelPerCubicYard: number;
  gravelPerTon: number;
  sandPerCubicYard: number;
  /** Fence */
  fencePostEach: number;
  fenceRailEach: number;
  fencePicketEach: number;
  fenceGateHardwareSet: number;
  /** Paint */
  paintPerGallon: number;
  primerPerGallon: number;
  /** Flooring / tile */
  flooringPerSqFt: number;
  tilePerSqFt: number;
  thinsetBag50lb: number;
  groutBag25lb: number;
  /** Mulch */
  mulchPerCubicYard: number;
  mulchBag2CuFt: number;
  /** Drywall */
  drywallSheet: number;
  jointCompoundBucket: number;
  drywallTapeRoll: number;
  cornerBeadEach: number;
  /** Deck */
  deckingPerLinearFoot: number;
  joistPerLinearFoot: number;
  railingPerLinearFoot: number;
  /** Sod */
  sodPerSqFt: number;
  sodPallet: number;
}

const DEFAULT_PRICES: PriceBook = {
  concretePerCubicYard: 165,
  concreteBag60lb: 6.5,
  concreteBag80lb: 8.0,

  gravelPerCubicYard: 55,
  gravelPerTon: 45,
  sandPerCubicYard: 45,

  fencePostEach: 18,
  fenceRailEach: 9,
  fencePicketEach: 3.5,
  fenceGateHardwareSet: 45,

  paintPerGallon: 42,
  primerPerGallon: 30,

  flooringPerSqFt: 3.2,
  tilePerSqFt: 3.5,
  thinsetBag50lb: 18,
  groutBag25lb: 22,

  mulchPerCubicYard: 42,
  mulchBag2CuFt: 4.5,

  drywallSheet: 16,
  jointCompoundBucket: 18,
  drywallTapeRoll: 7,
  cornerBeadEach: 6,

  deckingPerLinearFoot: 3.1,
  joistPerLinearFoot: 2.4,
  railingPerLinearFoot: 28,

  sodPerSqFt: 0.55,
  sodPallet: 260,
};

export type RegionKey = "default";

export function getPriceBook(_region: RegionKey = "default"): PriceBook {
  // Regional overrides intentionally not implemented yet — see module docblock.
  return DEFAULT_PRICES;
}

export const prices = DEFAULT_PRICES;

/**
 * Shared planning defaults.
 *
 * Centralised so "what waste percentage do we assume" has exactly one answer,
 * and so that answer can be shown to the user on the result page and changed
 * by them. Each value below notes where it comes from — a trade rule of thumb,
 * a product specification, or a published formula. Anything that cannot be
 * justified that way does not belong here.
 */
export const planningDefaults = {
  /*
   * Waste allowances. 10% is the common trade default for anything cut to fit.
   * The 5% cases are materials where offcuts are largely reusable (fence
   * pickets, sod) or where the loss is settling rather than cutting (mulch).
   * Paint defaults to 0 because its waste is already inside the coverage
   * figure on the can.
   */
  wasteConcrete: 10,
  wasteFence: 5,
  wastePaint: 0,
  wasteFlooring: 10,
  wasteMulch: 5,
  wasteGravel: 10,
  wasteDrywall: 10,
  wasteTile: 10,
  wasteDeck: 10,
  wasteSod: 5,

  /*
   * Paint coverage: 350 sq ft per gallon is the figure printed on most
   * interior latex, measured on smooth primed wall of a similar colour.
   * Primer covers less because it is applied to raw substrate.
   */
  paintCoverageSqFtPerGallon: 350,
  primerCoverageSqFtPerGallon: 300,
  /** A standard 3 × 7 ft door and a 3 × 5 ft window. */
  doorAreaSqFt: 21,
  windowAreaSqFt: 15,

  /*
   * Aggregate density, pounds per cubic foot, dry and loose. 100 lb/cu ft for
   * crushed stone works out to ~1.35 tons per cubic yard, matching the figure
   * quarries publish. Wet material weighs meaningfully more, which is why the
   * result page says so.
   */
  gravelDensityLbPerCuFt: 100,
  poundsPerTon: 2000,

  /*
   * Drywall accessories per 4 × 8 sheet. 36 screws is field-and-perimeter
   * fastening at 12 in on centre over 16 in framing; 5 lb of compound covers
   * tape plus two finish coats; 40 ft of tape is the seam length a sheet
   * contributes. All three are trade rules of thumb — technique changes
   * compound usage more than anything else, which the result page notes.
   */
  drywallScrewsPerSheet: 36,
  drywallCompoundLbPerSheet: 5,
  drywallTapeFtPerSheet: 40,

  /*
   * Thinset coverage for a standard notched trowel. Large-format tile with a
   * deeper notch can halve this. Grout is not a flat rate — see the published
   * formula in lib/calculations/tile.ts, which uses the actual tile size,
   * joint width, and thickness.
   */
  thinsetCoverageSqFtPer50lb: 95,
  groutCoverageSqFtPer25lb: 90,

  /*
   * Sod. A standard slab roll covers about 10 sq ft; pallets run 400–500 sq ft
   * depending on the farm, so 450 is the midpoint and both are editable.
   */
  sodRollCoverageSqFt: 10,
  sodPalletCoverageSqFt: 450,
} as const;
