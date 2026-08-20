import { getProject } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import { formatCurrency, formatQuantity } from "@/lib/units";

/**
 * The scenario comparison shown on the homepage, computed from the engine.
 *
 * Concrete at 20 × 16 is the clearest case the product has: ready-mix versus
 * bags is a $954 decision that most people make by guessing, and it is exactly
 * the kind of thing you want settled *before* you are standing in the aisle
 * with a trolley. Showing it on the homepage is the single most convincing
 * argument for the tool, and it costs nothing to make because the planner
 * already works it out.
 *
 * Derived rather than typed, for the same reason as the hero: a price default
 * changes and a hardcoded homepage starts lying about the product's own output.
 */

export interface CompareOption {
  name: string;
  summary: string;
  cost: string;
  costValue: number;
  quantity: string;
  recommended: boolean;
}

export interface Comparison {
  slug: string;
  project: string;
  context: string;
  options: CompareOption[];
  /** The gap between cheapest and dearest, which is the point being made. */
  saving: string;
}

export function concreteComparison(): Comparison | null {
  const project = getProject("concrete-calculator");
  if (!project) return null;

  const evaluation = evaluate(project, defaultValues(project, "us"), "us");
  if (!evaluation.ok) return null;

  const scenarios = evaluation.result.scenarios;
  if (scenarios.length < 2) return null;

  const options: CompareOption[] = scenarios.map((scenario) => {
    const quantityRow = scenario.rows.find((row) => row.measure !== "currency");
    return {
      name: scenario.name,
      summary: scenario.summary,
      cost: scenario.totalCost != null ? formatCurrency(scenario.totalCost) : "—",
      costValue: scenario.totalCost ?? 0,
      quantity: quantityRow
        ? formatQuantity(quantityRow.value, quantityRow.measure, {
            system: "us",
            precision: quantityRow.precision,
            unitOverride: quantityRow.unitOverride,
          })
        : "",
      recommended: Boolean(scenario.recommended),
    };
  });

  const costs = options.map((option) => option.costValue).filter((cost) => cost > 0);
  const saving = costs.length >= 2 ? Math.max(...costs) - Math.min(...costs) : 0;

  return {
    slug: project.slug,
    project: project.name,
    context: "A 20 × 16 ft patio, 4 in thick",
    options,
    saving: formatCurrency(saving),
  };
}
