import {
  formatCurrency,
  formatQuantity,
  fromCanonical,
  unitLabel,
  type UnitSystem,
} from "@/lib/units";
import type { MaterialLine, ResultRow } from "@/types/project";

/** Render a result row's value using the active unit system. */
export function formatRow(row: ResultRow, system: UnitSystem): string {
  if (row.measure === "currency") return formatCurrency(row.value);
  return formatQuantity(row.value, row.measure, {
    system,
    precision: row.precision,
    unitOverride: row.unitOverride,
  });
}

export function formatMaterialQuantity(line: MaterialLine, system: UnitSystem): string {
  return formatQuantity(line.quantity, line.measure, {
    system,
    precision: line.precision,
    unitOverride: line.unitOverride,
  });
}

/**
 * A unit price, expressed in whatever system the reader is using.
 *
 * `unitPrice` is per canonical unit — dollars per cubic yard, per square foot.
 * Printed raw beside a converted quantity it reads as an error: "3.40 m³ ·
 * $165.00 per yd³" invites the reader to multiply 3.40 by 165 and conclude the
 * $734 total is wrong. Lines that price per unit of measure declare
 * `unitPriceMeasure`, and the price is rescaled to match the quantity beside it.
 *
 * Package prices ("per bag", "per pallet") mean the same thing in both systems
 * and pass through untouched.
 */
export function formatUnitPrice(line: MaterialLine, system: UnitSystem = "us"): string {
  if (line.unitPrice === undefined) return "—";

  if (line.unitPriceMeasure) {
    // One canonical unit is `perDisplayUnit` display units, so a price per
    // canonical unit divided by that is the price per display unit.
    const perDisplayUnit = fromCanonical(1, line.unitPriceMeasure, system);
    const price = perDisplayUnit > 0 ? line.unitPrice / perDisplayUnit : line.unitPrice;
    return `${formatCurrency(price)} per ${unitLabel(line.unitPriceMeasure, system)}`;
  }

  return `${formatCurrency(line.unitPrice)}${line.unitPriceLabel ? ` ${line.unitPriceLabel}` : ""}`;
}
