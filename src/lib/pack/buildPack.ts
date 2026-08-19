import { getProject } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import { buildShoppingList } from "@/components/results/ShoppingList";
import { formatMaterialQuantity, formatRow, formatUnitPrice } from "@/lib/format";
import { formatCurrency, formatQuantity } from "@/lib/units";
import { site } from "@/config/site";
import type { SavedProject } from "@/lib/storage/savedProjects";

/**
 * The Project Pack model.
 *
 * Everything is pre-formatted into strings here so the preview, the print
 * layout, and the PDF renderer all show exactly the same numbers — there is one
 * place where a value could be formatted differently, and this is it.
 */

export interface PackRow {
  label: string;
  value: string;
  note?: string;
}

export interface PackMaterial {
  name: string;
  quantity: string;
  unitPrice: string;
  cost: string;
  note?: string;
  isEstimate: boolean;
}

export interface PackScenario {
  name: string;
  summary: string;
  recommended: boolean;
  rows: PackRow[];
}

export interface PackChecklistItem {
  label: string;
  detail?: string;
  checked: boolean;
  optional: boolean;
}

export interface ProjectPack {
  brand: string;
  tagline: string;
  title: string;
  projectName: string;
  category: string;
  createdAt: string;
  headline: { label: string; value: string; sublabel?: string };
  summary: PackRow[];
  materials: PackMaterial[];
  costTotal: string;
  budgetNote: string;
  assumptions: PackRow[];
  formulas: PackRow[];
  scenarios: PackScenario[];
  checklist: PackChecklistItem[];
  steps: string[];
  warnings: string[];
  notes: string;
  disclaimer: string;
  effort: { difficulty: string; timeCategory: string };
  contractorQuote?: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function buildPack(saved: SavedProject): ProjectPack | undefined {
  const project = getProject(saved.slug);
  if (!project) return undefined;

  const values = { ...defaultValues(project, saved.unitSystem), ...saved.values };
  const evaluation = evaluate(project, values, saved.unitSystem);
  if (!evaluation.ok) return undefined;

  const result = evaluation.result;
  const system = saved.unitSystem;
  const checked = new Set(saved.checked);

  const headlineValue =
    result.headline.measure === "currency"
      ? formatCurrency(result.headline.value)
      : formatQuantity(result.headline.value, result.headline.measure, {
          system,
          precision: result.headline.precision,
          unitOverride: result.headline.unitOverride,
        });

  return {
    brand: site.name,
    tagline: site.tagline,
    title: saved.title || `${project.name} project`,
    projectName: project.name,
    category: project.category,
    createdAt: DATE_FORMAT.format(new Date(saved.updatedAt || Date.now())),

    headline: {
      label: result.headline.label,
      value: headlineValue,
      sublabel: result.headline.sublabel,
    },

    summary: result.summary.map((row) => ({
      label: row.label,
      value: formatRow(row, system),
      note: row.note,
    })),

    materials: result.materials.map((line) => ({
      name: line.name,
      quantity: formatMaterialQuantity(line, system),
      unitPrice: formatUnitPrice(line),
      cost: line.cost === undefined ? "—" : formatCurrency(line.cost),
      note: line.note,
      isEstimate: Boolean(line.isEstimate),
    })),

    costTotal: formatCurrency(result.costTotal),
    budgetNote:
      "Costs use ProjectKit planning prices or the prices entered by the project owner. They are not live retail prices.",

    assumptions: result.assumptions.map((item) => ({
      label: item.label,
      value: item.value,
    })),

    formulas: result.formulas.map((item) => ({
      label: item.label,
      value: item.expression,
      note: item.kind === "math" ? "Exact" : "Assumption",
    })),

    scenarios: result.scenarios.map((scenario) => ({
      name: scenario.name,
      summary: scenario.summary,
      recommended: Boolean(scenario.recommended),
      rows: scenario.rows.map((row) => ({
        label: row.label,
        value: formatRow(row, system),
      })),
    })),

    checklist: buildShoppingList(result, system).map((entry) => ({
      label: entry.label,
      detail: entry.detail,
      checked: checked.has(entry.id),
      optional: Boolean(entry.optional),
    })),

    steps: project.steps,
    warnings: [...result.warnings, ...(project.disclaimers ?? [])],
    notes: saved.notes,
    disclaimer:
      "ProjectKit provides planning estimates only. Actual requirements, costs, installation methods, structural requirements, permits, safety requirements, and building codes vary. Verify critical specifications before purchasing materials or beginning work.",
    effort: {
      difficulty: result.effort.difficulty,
      timeCategory: result.effort.timeCategory,
    },
    contractorQuote:
      saved.contractorQuote && saved.contractorQuote > 0
        ? formatCurrency(saved.contractorQuote)
        : undefined,
  };
}

/** Filename-safe slug for the downloaded PDF. */
export function packFileName(pack: ProjectPack): string {
  const base = pack.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `projectkit-${base || "project"}.pdf`;
}
