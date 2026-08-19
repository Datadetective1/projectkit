import { formatMaterialQuantity, formatRow } from "@/lib/format";
import { formatCurrency, formatQuantity, type UnitSystem } from "@/lib/units";
import { site } from "@/config/site";
import type { CalculationResult } from "@/types/project";

/**
 * A plain-text summary of an estimate — the thing people actually paste into a
 * message to a partner or a supplier. Kept short enough to read on a phone.
 */
export function buildTextSummary(input: {
  projectName: string;
  result: CalculationResult;
  system: UnitSystem;
  url?: string;
}): string {
  const { projectName, result, system, url } = input;

  const headlineValue =
    result.headline.measure === "currency"
      ? formatCurrency(result.headline.value)
      : formatQuantity(result.headline.value, result.headline.measure, {
          system,
          precision: result.headline.precision,
          unitOverride: result.headline.unitOverride,
        });

  const lines: string[] = [
    `${projectName} — ${site.name} estimate`,
    "",
    `${result.headline.label}: ${headlineValue}`,
  ];

  if (result.headline.sublabel) lines.push(result.headline.sublabel);

  lines.push("", "Summary");
  for (const row of result.summary) {
    lines.push(`- ${row.label}: ${formatRow(row, system)}`);
  }

  lines.push("", "Materials");
  for (const line of result.materials) {
    const cost = line.cost === undefined ? "" : ` — ${formatCurrency(line.cost)}`;
    lines.push(`- ${line.name}: ${formatMaterialQuantity(line, system)}${cost}`);
  }

  if (result.costTotal > 0) {
    lines.push("", `Estimated material total: ${formatCurrency(result.costTotal)}`);
  }

  lines.push("", "Planning estimate only — verify before you buy.");
  if (url) lines.push(url);

  return lines.join("\n");
}
