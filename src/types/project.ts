import type { Measure, UnitSystem } from "@/lib/units";

/* ---------------------------------------------------------------- inputs -- */

export type InputTier = "quick" | "advanced";

interface InputBase {
  id: string;
  label: string;
  /** Short helper shown under the field. Keep it plain-English. */
  help?: string;
  tier: InputTier;
  /** Optional grouping heading inside a tier. */
  group?: string;
  /** Hide the field unless the predicate passes (e.g. shape === "circle"). */
  showWhen?: (values: InputValues) => boolean;
}

export interface NumberInput extends InputBase {
  type: "number";
  measure: Measure;
  /** Default expressed in canonical (US) units. */
  defaultValue: number;
  /** Inclusive bounds in canonical units. Used for validation messages. */
  min?: number;
  max?: number;
  step?: number;
  /** Field is required for a calculation to run at all. */
  required?: boolean;
  /** Replaces the derived unit suffix, e.g. "$ / yd³" or "bags". */
  unitOverride?: string;
  /** Extra precision when echoing the value back into the input box. */
  precision?: number;
  /** Values of 0 are meaningful (e.g. gate count) rather than "empty". */
  allowZero?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  /** Free-form payload used by calculations (density, coverage, price, …). */
  meta?: Record<string, number | string>;
}

export interface SelectInput extends InputBase {
  type: "select";
  defaultValue: string;
  options: SelectOption[];
}

export interface ToggleInput extends InputBase {
  type: "toggle";
  defaultValue: boolean;
}

export type ProjectInput = NumberInput | SelectInput | ToggleInput;

export type InputValue = number | string | boolean;
export type InputValues = Record<string, InputValue>;

/* --------------------------------------------------------------- results -- */

export interface ResultRow {
  label: string;
  value: number;
  measure: Measure;
  precision?: number;
  unitOverride?: string;
  note?: string;
  emphasis?: boolean;
}

export interface MaterialLine {
  id: string;
  name: string;
  /** Canonical quantity. For packaged goods this is a plain count. */
  quantity: number;
  measure: Measure;
  precision?: number;
  /** e.g. "bags", "boxes", "sheets", "posts". */
  unitOverride?: string;
  /** Price per displayed unit, in dollars. */
  unitPrice?: number;
  unitPriceLabel?: string;
  cost?: number;
  note?: string;
  /** Rough planning allowance rather than a computed quantity. */
  isEstimate?: boolean;
  optional?: boolean;
  /** Search term used for the "Shop materials" affiliate link. */
  searchTerm?: string;
}

export interface Scenario {
  id: string;
  name: string;
  summary: string;
  rows: ResultRow[];
  totalCost?: number;
  recommended?: boolean;
}

export interface FormulaLine {
  label: string;
  expression: string;
  /** "math" = exact arithmetic, "assumption" = a planning convention. */
  kind: "math" | "assumption";
}

export interface AssumptionLine {
  label: string;
  value: string;
}

export interface ShoppingItem {
  id: string;
  label: string;
  /** Rendered detail such as "4.5 yd³" — already formatted. */
  detail?: string;
  optional?: boolean;
}

export interface CalculationResult {
  headline: {
    label: string;
    value: number;
    measure: Measure;
    precision?: number;
    unitOverride?: string;
    sublabel?: string;
  };
  summary: ResultRow[];
  materials: MaterialLine[];
  costTotal: number;
  scenarios: Scenario[];
  /** Plain-English "what this means" paragraphs. */
  explanation: string[];
  formulas: FormulaLine[];
  assumptions: AssumptionLine[];
  /** Checklist entries that have no computed quantity. */
  shoppingExtras: ShoppingItem[];
  warnings: string[];
  /** Rough difficulty + time signal for the DIY-vs-contractor card. */
  effort: {
    difficulty: "Easy" | "Moderate" | "Challenging";
    timeCategory: string;
    notes: string[];
  };
}

export interface CalculationContext {
  /** Values already normalised to canonical (US) units. */
  values: InputValues;
  unitSystem: UnitSystem;
}

export type CalculationFunction = (ctx: CalculationContext) => CalculationResult;

/* ------------------------------------------------------------ definition -- */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ProjectSeo {
  title: string;
  description: string;
  /** Short label used in breadcrumbs. */
  breadcrumb: string;
}

export interface ProjectDefinition {
  slug: string;
  /** Short name used on cards and in navigation ("Concrete"). */
  name: string;
  /** Full page heading. */
  h1: string;
  category: string;
  /** One-line card description. */
  tagline: string;
  /** Two-sentence intro above the planner. */
  intro: string;
  /** Lucide icon name resolved by components/ProjectIcon. */
  icon: string;
  /** Tailwind-friendly accent token used for card + result theming. */
  accent: AccentToken;
  inputs: ProjectInput[];
  calculate: CalculationFunction;
  /** High-level, planning-level project sequence. */
  steps: string[];
  faq: FaqItem[];
  related: string[];
  seo: ProjectSeo;
  /** Project-specific disclaimers shown alongside the global one. */
  disclaimers?: string[];
  /** Natural-language keywords used by the deterministic parser. */
  keywords: string[];
}

export type AccentToken =
  | "slate"
  | "amber"
  | "violet"
  | "emerald"
  | "orange"
  | "sky"
  | "rose"
  | "teal"
  | "lime"
  | "indigo";
