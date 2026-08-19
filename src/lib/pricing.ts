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
   * Drywall accessories per 4 × 8 sheet, all trade rules of thumb.
   *
   * 36 screws is field-and-perimeter fastening at 12 in on centre over 16 in
   * framing (published figures run 28–36); 5 lb of compound covers tape plus
   * two finish coats, which works out to about 395 sq ft per 4.5-gallon bucket
   * against a published ~475, so it errs toward buying enough.
   *
   * 12 ft of tape per sheet is the seam length a sheet actually contributes —
   * horizontal wall seams, vertical butt joints, inside corners, the ceiling
   * angle, and ceiling seams. Verified two ways in
   * scripts/audit-drywall-tape.mts: a geometric seam count across five room
   * sizes gives 9–12 ft per sheet, and the trade figure of ~380 linear ft per
   * 1,000 sq ft of board agrees within a few percent.
   */
  drywallScrewsPerSheet: 36,
  drywallCompoundLbPerSheet: 5,
  drywallTapeFtPerSheet: 12,

  /*
   * Thinset coverage per 50 lb bag, chosen by the notch size the tile calls
   * for. Manufacturer coverage charts (Custom Building Products, Mapei,
   * Laticrete) give roughly:
   *
   *   1/4 × 1/4 in square notch   80–100 sq ft   small tile, up to ~8 in
   *   1/4 × 3/8 in square notch   60–80  sq ft   typical 8–16 in floor tile
   *   1/2 × 1/2 in square notch   40–50  sq ft   large format, over ~16 in
   *
   * A single flat rate under-orders badly at the large-format end, and running
   * short of thinset mid-floor is worse than a spare bag, so each band takes
   * the middle-to-low end of its range.
   */
  thinsetCoverageSmallTile: 90,
  thinsetCoverageStandardTile: 70,
  thinsetCoverageLargeFormat: 45,
  /** Tile edge (in) at or below which the next-smaller notch applies. */
  thinsetSmallTileMaxIn: 8,
  thinsetLargeFormatMinIn: 16,

  /*
   * Exterior and deck screws are sold by weight, not by the piece. A 5 lb box
   * of #8 × 2-1/2 in coated deck screws runs about 350 pieces across the major
   * retailers, so a screw count only becomes a shopping list once it is divided
   * by this. Drywall screws are lighter and boxed at 1 lb — see
   * drywallScrewsPerSheet and the note beside it.
   */
  exteriorScrewsPerBox: 350,

  /** Grout is not a flat rate — see the published formula in calculations/tile.ts. */
  groutCoverageSqFtPer25lb: 90,

  /*
   * Sod. A standard slab roll covers about 10 sq ft; pallets run 400–500 sq ft
   * depending on the farm, so 450 is the midpoint and both are editable.
   */
  sodRollCoverageSqFt: 10,
  sodPalletCoverageSqFt: 450,
} as const;
