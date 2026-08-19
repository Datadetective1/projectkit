import { formatCurrency, formatQuantity, type UnitSystem } from "@/lib/units";
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

export function formatUnitPrice(line: MaterialLine): string {
  if (line.unitPrice === undefined) return "—";
  return `${formatCurrency(line.unitPrice)}${line.unitPriceLabel ? ` ${line.unitPriceLabel}` : ""}`;
}
