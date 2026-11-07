import { planningDefaults } from "@/lib/pricing";
import type { InputValues } from "@/types/project";

/**
 * Turning "I have 3 yards of mulch" into planner inputs.
 *
 * The planners take dimensions, not volumes, so a volume question is asked by
 * choosing an area that, at the given depth, holds exactly that amount. Waste
 * is set to zero because the person already has the material: the question is
 * what it is, not how much to buy. Everything shown on the page then comes out
 * of the same `evaluate` the planner runs.
 */

/** Square feet one cubic yard covers at one inch deep: 27 cu ft × 12. */
const SQ_FT_PER_YARD_INCH = 324;

/** The gravel planner's material options, keyed by density in lb per cu ft. */
export const GRAVEL_MATERIALS: { key: string; name: string }[] = [
  { key: "100", name: "Crushed stone / #57" },
  { key: "96", name: "Pea gravel" },
  { key: "105", name: "Crusher run / road base" },
  { key: "98", name: "River rock" },
  { key: "99", name: "Decomposed granite" },
];

/** A gravel area expressed as a rectangle ten feet wide, so the planner hand-off reads naturally. */
const GRAVEL_WIDTH_FT = 10;

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

/** Mulch inputs holding `yards` cubic yards at `depth` inches. */
export function mulchForYards(yards: number, depth = 3, bagSize?: number): InputValues {
  return {
    shape: "custom",
    area: round((yards * SQ_FT_PER_YARD_INCH) / depth),
    depth,
    waste: 0,
    ...(bagSize ? { bagSize } : {}),
  };
}

/** Gravel inputs holding `yards` cubic yards at `depth` inches. */
export function gravelForYards(yards: number, depth = 4, material = "100"): InputValues {
  return {
    length: round((yards * SQ_FT_PER_YARD_INCH) / depth / GRAVEL_WIDTH_FT),
    width: GRAVEL_WIDTH_FT,
    depth,
    material,
    waste: 0,
  };
}

/** Gravel inputs weighing `tons` short tons at `depth` inches, for a given material. */
export function gravelForTons(tons: number, depth = 4, material = "100"): InputValues {
  const density = Number(material) || planningDefaults.gravelDensityLbPerCuFt;
  const cubicFeet = (tons * planningDefaults.poundsPerTon) / density;
  const areaSqFt = cubicFeet / (depth / 12);
  return {
    length: round(areaSqFt / GRAVEL_WIDTH_FT),
    width: GRAVEL_WIDTH_FT,
    depth,
    material,
    waste: 0,
  };
}

/** "1 yard", "1.5 yards", "10 tons". */
export function amountLabel(amount: { value: number; unit: "yd" | "ton" }) {
  const noun = amount.unit === "yd" ? "yard" : "ton";
  return `${amount.value} ${amount.value === 1 ? noun : `${noun}s`}`;
}
