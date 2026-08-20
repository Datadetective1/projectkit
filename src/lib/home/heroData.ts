import { getProject } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import { formatCurrency, formatQuantity } from "@/lib/units";

/**
 * The hero demonstration, computed rather than written.
 *
 * The old hero preview had its figures typed into the markup. They were correct
 * when typed — and that is the problem: a waste default or a planning price
 * changes and the homepage quietly starts advertising a number the product no
 * longer produces. On a tool whose entire pitch is "these numbers are real",
 * that is the worst possible place to keep a stale copy.
 *
 * So it runs the actual engine at its documented defaults, on the server, at
 * build time. Every figure in the hero is the same arithmetic a visitor gets
 * when they open the planner. It cannot drift, and it cannot be invented.
 *
 * Three projects, chosen to show range rather than to flatter: a hard outdoor
 * build, a cheap indoor afternoon, and an expensive structure.
 */

export interface HeroStage {
  /** What this step of the transformation is called. */
  label: string;
  /** The figure itself, already formatted in US units. */
  value: string;
  /** One line of why, when the number needs it. */
  note?: string;
}

export interface HeroProject {
  slug: string;
  name: string;
  /** How someone would actually say it, typed into the box. */
  idea: string;
  /** The footprint, for the plan diagram. */
  plan?: { width: string; depth: string };
  stages: HeroStage[];
  /** The headline figure, split so it can be animated and unit-labelled. */
  headline: { value: number; decimals: number; unit: string; label: string };
  cost: number;
  materialCount: number;
  difficulty: string;
  time: string;
}

const HERO_SLUGS = ["concrete-calculator", "paint-calculator", "deck-calculator"] as const;

const IDEAS: Record<string, string> = {
  "concrete-calculator": "I want to build a 20 × 16 concrete patio",
  "paint-calculator": "I want to repaint a 12 × 12 bedroom",
  "deck-calculator": "I want to build a 16 × 12 deck with railings",
};

const PLANS: Record<string, { width: string; depth: string }> = {
  "concrete-calculator": { width: "20 ft", depth: "16 ft" },
  "paint-calculator": { width: "12 ft", depth: "12 ft" },
  "deck-calculator": { width: "16 ft", depth: "12 ft" },
};

/** Split "4.35 yd³" into a number to animate and a unit to sit beside it. */
function splitQuantity(formatted: string): { value: number; decimals: number; unit: string } {
  const match = formatted.match(/^([\d,]+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return { value: 0, decimals: 0, unit: formatted };

  const [, numeric, unit] = match;
  const decimals = numeric.includes(".") ? numeric.split(".")[1].length : 0;
  return { value: Number(numeric.replace(/,/g, "")), decimals, unit };
}

export function heroProjects(): HeroProject[] {
  const built: HeroProject[] = [];

  for (const slug of HERO_SLUGS) {
    const project = getProject(slug);
    if (!project) continue;

    const evaluation = evaluate(project, defaultValues(project, "us"), "us");
    if (!evaluation.ok) continue;

    const result = evaluation.result;
    const headlineText = formatQuantity(result.headline.value, result.headline.measure, {
      system: "us",
      precision: result.headline.precision,
      unitOverride: result.headline.unitOverride,
    });

    /*
     * The transformation the hero is showing: what you measured, what that
     * works out to, and what you actually have to buy. Taken from the engine's
     * own summary rows rather than re-derived here, so the middle of the story
     * is as unfakeable as the ends of it.
     */
    const stages: HeroStage[] = result.summary.slice(0, 3).map((row) => ({
      label: row.label,
      value: formatQuantity(row.value, row.measure, {
        system: "us",
        precision: row.precision,
        unitOverride: row.unitOverride,
      }),
      note: row.note,
    }));

    built.push({
      slug: project.slug,
      name: project.name,
      idea: IDEAS[slug] ?? project.tagline,
      plan: PLANS[slug],
      stages,
      headline: {
        ...splitQuantity(headlineText),
        label: result.headline.sublabel ?? result.headline.label,
      },
      cost: Math.round(result.costTotal),
      materialCount: result.materials.length,
      difficulty: result.effort.difficulty,
      time: result.effort.timeCategory,
    });
  }

  return built;
}

/** Formatted cost, for the places that want the string rather than the number. */
export const formatHeroCost = (value: number) => formatCurrency(value);
