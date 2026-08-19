import { roundTo, type UnitSystem } from "@/lib/units";
import type { InputValues, MaterialLine, ShoppingItem } from "@/types/project";

/* Small, boring helpers shared by every project calculation. */

export function num(values: InputValues, id: string, fallback = 0): number {
  const raw = values[id];
  const numeric = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function str(values: InputValues, id: string, fallback = ""): string {
  const raw = values[id];
  return typeof raw === "string" ? raw : fallback;
}

export function bool(values: InputValues, id: string, fallback = false): boolean {
  const raw = values[id];
  return typeof raw === "boolean" ? raw : fallback;
}

/** Waste percentage → multiplier, clamped to something defensible. */
export function wasteMultiplier(percent: number): number {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return 1 + clamped / 100;
}

export const CUBIC_FEET_PER_YARD = 27;

export function cubicFeetToYards(cubicFeet: number): number {
  return cubicFeet / CUBIC_FEET_PER_YARD;
}

export function inchesToFeet(inches: number): number {
  return inches / 12;
}

/** Packaged goods are bought whole: always round up, never below one. */
export function packagesNeeded(total: number, perPackage: number): number {
  if (perPackage <= 0 || total <= 0) return 0;
  return Math.ceil(roundTo(total / perPackage, 6));
}

export function costOf(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return roundTo(Math.max(quantity, 0) * Math.max(unitPrice, 0), 2);
}

export function sumCost(lines: MaterialLine[]): number {
  return roundTo(
    lines.reduce((total, line) => total + (line.optional ? 0 : line.cost ?? 0), 0),
    2,
  );
}

export function shoppingItem(
  id: string,
  label: string,
  detail?: string,
  optional = false,
): ShoppingItem {
  return { id, label, detail, optional };
}

/** Circle area from a diameter, in the same squared unit as the input. */
export function circleArea(diameter: number): number {
  const radius = Math.max(diameter, 0) / 2;
  return Math.PI * radius * radius;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return Math.abs(count) === 1 ? singular : plural ?? `${singular}s`;
}

/**
 * A readable "20 × 16 ft" style dimension string for headings and the pack.
 */
export function dimensionLabel(
  length: number,
  width: number,
  system: UnitSystem,
): string {
  const unit = system === "us" ? "ft" : "m";
  return `${roundTo(length, 2)} × ${roundTo(width, 2)} ${unit}`;
}
