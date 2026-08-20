import { getProject } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import { formatCurrency, formatQuantity } from "@/lib/units";
import type { CalculationResult, InputValues, ResultRow } from "@/types/project";

/**
 * Running the planner's own arithmetic for an answer page.
 *
 * The whole credibility of this content layer rests on one property: the number
 * on `/concrete-calculator/10x10-slab` is the number the concrete planner
 * produces at 10 × 10. Not a number someone transcribed from it once. So every
 * page goes through here, and here runs `evaluate` — the same function the
 * planner calls.
 */

export interface Computed {
  result: CalculationResult;
  /** Formatted in US units, which is what these pages are written in. */
  fmt: (row: ResultRow | undefined) => string;
  money: (value: number | undefined) => string;
  /** Find a summary row by a fragment of its label. */
  row: (label: RegExp) => ResultRow | undefined;
}

export function compute(plannerSlug: string, values: InputValues): Computed | null {
  const project = getProject(plannerSlug);
  if (!project) return null;

  const evaluation = evaluate(project, { ...defaultValues(project, "us"), ...values }, "us");
  if (!evaluation.ok) return null;

  const result = evaluation.result;

  return {
    result,
    fmt: (row) =>
      row
        ? formatQuantity(row.value, row.measure, {
            system: "us",
            precision: row.precision,
            unitOverride: row.unitOverride,
          })
        : "—",
    money: (value) => (value == null ? "—" : formatCurrency(value)),
    row: (label) => result.summary.find((entry) => label.test(entry.label)),
  };
}

/**
 * The three numbers a size question actually has.
 *
 * Competing pages give one figure and move on, which is why people under-order.
 * There are three, they are all different, and the gap between the first and
 * the last is the entire reason a calculator is worth using:
 *
 *  - **calculated** — the geometry, and nothing else
 *  - **withWaste** — plus the planner's waste allowance
 *  - **purchase** — rounded to what a supplier will actually sell you
 *
 * Returns nulls rather than guesses when a planner does not express all three,
 * so a page can render what exists instead of inventing the rest.
 */
export function threeNumbers(computed: Computed) {
  const calculated = computed.row(/^(calculated volume|volume|lawn area|wall area)/i);
  const purchase = computed.row(/recommended purchase|sod to buy/i);
  const waste = computed.row(/waste allowance/i);

  return {
    calculated: calculated ? computed.fmt(calculated) : null,
    withWaste: computed.fmt(computed.result.headline as unknown as ResultRow),
    purchase: purchase ? computed.fmt(purchase) : null,
    wastePct: waste ? computed.fmt(waste) : null,
  };
}

/** The scenarios, split into the one the engine recommends and the alternative. */
export function scenarioSplit(computed: Computed) {
  const recommended = computed.result.scenarios.find((scenario) => scenario.recommended);
  const alternative = computed.result.scenarios.find((scenario) => !scenario.recommended);
  return { recommended, alternative };
}
