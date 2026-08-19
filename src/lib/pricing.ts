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
 * Shared planning defaults. Centralised so "what waste percentage do we assume"
 * has exactly one answer, and so the answer is easy to show the user.
 */
export const planningDefaults = {
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

  /** Coverage assumptions */
  paintCoverageSqFtPerGallon: 350,
  primerCoverageSqFtPerGallon: 300,
  doorAreaSqFt: 21, // 3 ft × 7 ft
  windowAreaSqFt: 15, // 3 ft × 5 ft

  /** Aggregate density, pounds per cubic foot (dry, loose). */
  gravelDensityLbPerCuFt: 100,
  poundsPerTon: 2000,

  /** Drywall accessories per sheet — trade rules of thumb. */
  drywallScrewsPerSheet: 36,
  drywallCompoundLbPerSheet: 5,
  drywallTapeFtPerSheet: 40,

  /** Tile */
  thinsetCoverageSqFtPer50lb: 95,
  groutCoverageSqFtPer25lb: 90,

  /** Sod */
  sodRollCoverageSqFt: 10,
  sodPalletCoverageSqFt: 450,
} as const;
