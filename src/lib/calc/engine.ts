import { rateLabel, rateScale, roundTo, type UnitSystem } from "@/lib/units";
import type {
  CalculationResult,
  InputValue,
  InputValues,
  NumberInput,
  ProjectDefinition,
  ProjectInput,
} from "@/types/project";

/**
 * Form state holds values in the *display* unit system so typing never fights
 * with conversion rounding. Calculations always receive canonical (US) values.
 */

export function isNumberInput(input: ProjectInput): input is NumberInput {
  return input.type === "number";
}

/** Inputs currently visible given the values entered so far. */
export function visibleInputs(
  def: ProjectDefinition,
  values: InputValues,
): ProjectInput[] {
  return def.inputs.filter((input) => !input.showWhen || input.showWhen(values));
}

export function defaultValues(
  def: ProjectDefinition,
  system: UnitSystem,
): InputValues {
  const values: InputValues = {};
  for (const input of def.inputs) {
    if (input.type === "number") {
      values[input.id] = roundTo(
        inputFromCanonical(input.defaultValue, input, system),
        input.precision ?? 4,
      );
    } else {
      values[input.id] = input.defaultValue;
    }
  }
  return values;
}

/**
 * Values that are the same number in both systems.
 *
 * A currency field is normally one of them — a dollar is a dollar. It stops
 * being one the moment it is a *rate*: "$165 per yd³" is "$215.81 per m³", and
 * showing the metric reader 165 against a per-m³ label understates by 31%.
 */
function isSystemAgnostic(input: NumberInput): boolean {
  if (input.perMeasure !== undefined) return false;
  return (
    input.measure === "currency" || input.measure === "percent" || input.measure === "count"
  );
}

/** Display value → canonical, honouring a rate's denominator. */
function inputToCanonical(value: number, input: NumberInput, system: UnitSystem): number {
  const scale = rateScale(input.measure, input.perMeasure, system);
  return scale === 0 ? value : value / scale;
}

/** Canonical → display value, honouring a rate's denominator. */
function inputFromCanonical(value: number, input: NumberInput, system: UnitSystem): number {
  return value * rateScale(input.measure, input.perMeasure, system);
}

/**
 * The exact canonical value behind each field.
 *
 * Display values are rounded so the input box stays readable, which makes a
 * naive round-trip lossy: 20 ft → 4.877 m → 15.999 ft. Anchoring conversions to
 * the value the user actually entered keeps flipping units exact.
 */
export type CanonicalAnchors = Record<string, number>;

export function anchorsFor(
  def: ProjectDefinition,
  values: InputValues,
  system: UnitSystem,
): CanonicalAnchors {
  const anchors: CanonicalAnchors = {};
  for (const input of def.inputs) {
    if (input.type !== "number") continue;
    const raw = values[input.id];
    if (raw === "" || raw === undefined || raw === null) continue;
    const numeric = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(numeric)) continue;
    anchors[input.id] = inputToCanonical(numeric, input, system);
  }
  return anchors;
}

/**
 * Re-express display values when the user flips between US and metric.
 *
 * Pass `anchors` (the canonical value recorded when each field was last typed
 * into) to make repeated switching exact rather than drifting a little each
 * time.
 */
export function convertValues(
  def: ProjectDefinition,
  values: InputValues,
  from: UnitSystem,
  to: UnitSystem,
  anchors?: CanonicalAnchors,
): InputValues {
  if (from === to) return { ...values };
  const next: InputValues = { ...values };

  for (const input of def.inputs) {
    if (input.type !== "number") continue;
    if (isSystemAgnostic(input)) continue;

    const raw = values[input.id];
    if (raw === "" || raw === undefined || raw === null) continue;
    const current = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(current)) continue;

    // Prefer the anchor, but only while it still agrees with what is on screen —
    // otherwise a field edited since the last switch would snap back.
    const anchored = anchors?.[input.id];
    const displayedNow =
      anchored === undefined
        ? undefined
        : roundTo(inputFromCanonical(anchored, input, from), input.precision ?? 3);
    const canonical =
      anchored !== undefined && displayedNow === current
        ? anchored
        : inputToCanonical(current, input, from);

    next[input.id] = roundTo(
      inputFromCanonical(canonical, input, to),
      input.precision ?? 3,
    );
  }

  return next;
}

/** Convert a whole form's display values into canonical values. */
export function toCanonicalValues(
  def: ProjectDefinition,
  values: InputValues,
  system: UnitSystem,
): InputValues {
  const canonical: InputValues = {};
  for (const input of def.inputs) {
    const value = values[input.id];
    if (input.type === "number") {
      const numeric = typeof value === "number" ? value : Number(value);
      canonical[input.id] = Number.isFinite(numeric)
        ? inputToCanonical(numeric, input, system)
        : input.defaultValue;
    } else {
      canonical[input.id] = value ?? input.defaultValue;
    }
  }
  return canonical;
}

/* ------------------------------------------------------------ validation -- */

export type ValidationErrors = Record<string, string>;

const MAX_REASONABLE = {
  length: 5000, // ft — beyond this the user almost certainly mistyped
  area: 500_000,
  percent: 100,
  currency: 1_000_000,
} as const;

export function validate(
  def: ProjectDefinition,
  values: InputValues,
  system: UnitSystem,
): ValidationErrors {
  const errors: ValidationErrors = {};
  const visible = visibleInputs(def, values);

  for (const input of visible) {
    if (input.type !== "number") continue;
    const raw = values[input.id];
    const isBlank = raw === "" || raw === null || raw === undefined;
    const numeric = typeof raw === "number" ? raw : Number(raw);

    if (isBlank || Number.isNaN(numeric)) {
      if (input.required) errors[input.id] = "Enter a number.";
      continue;
    }
    if (!Number.isFinite(numeric)) {
      errors[input.id] = "Enter a real number.";
      continue;
    }
    if (numeric < 0) {
      errors[input.id] = "Must be zero or more.";
      continue;
    }
    if (numeric === 0 && input.required && !input.allowZero) {
      errors[input.id] = "Must be greater than zero.";
      continue;
    }

    const canonical = inputToCanonical(numeric, input, system);
    const label = rateLabel(input.measure, input.perMeasure, system);
    const suffix = label && label !== "$" ? ` ${label}` : "";

    if (input.min !== undefined && canonical < input.min - 1e-9) {
      const shown = roundTo(inputFromCanonical(input.min, input, system), 2);
      errors[input.id] = `Must be at least ${shown}${suffix}.`;
      continue;
    }
    if (input.max !== undefined && canonical > input.max + 1e-9) {
      const shown = roundTo(inputFromCanonical(input.max, input, system), 2);
      errors[input.id] = `Must be ${shown}${suffix} or less.`;
      continue;
    }
    if (input.measure === "percent" && numeric > MAX_REASONABLE.percent) {
      errors[input.id] = "Waste above 100% is unlikely — double-check this.";
      continue;
    }
    if (input.measure === "length" && canonical > MAX_REASONABLE.length) {
      errors[input.id] = "That looks unrealistically large for a home project.";
      continue;
    }
    if (input.measure === "area" && canonical > MAX_REASONABLE.area) {
      errors[input.id] = "That looks unrealistically large for a home project.";
      continue;
    }
    if (input.measure === "currency" && numeric > MAX_REASONABLE.currency) {
      errors[input.id] = "That price looks unrealistic.";
    }
  }

  return errors;
}

/* ------------------------------------------------------------ evaluation -- */

export interface EvaluationSuccess {
  ok: true;
  result: CalculationResult;
}
export interface EvaluationFailure {
  ok: false;
  errors: ValidationErrors;
  /** Present when the calculation itself threw rather than failing validation. */
  message?: string;
}
export type Evaluation = EvaluationSuccess | EvaluationFailure;

/**
 * Run a project's calculation with validation and a hard guard against any
 * NaN/Infinity reaching the UI.
 */
export function evaluate(
  def: ProjectDefinition,
  values: InputValues,
  unitSystem: UnitSystem,
): Evaluation {
  const errors = validate(def, values, unitSystem);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  try {
    const canonical = toCanonicalValues(def, values, unitSystem);
    const result = def.calculate({ values: canonical, unitSystem });
    return { ok: true, result: sanitizeResult(result) };
  } catch (error) {
    return {
      ok: false,
      errors: {},
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong running this calculation.",
    };
  }
}

function safe(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Belt-and-braces: users must never see NaN, Infinity, or undefined. */
export function sanitizeResult(result: CalculationResult): CalculationResult {
  return {
    ...result,
    headline: { ...result.headline, value: safe(result.headline.value) },
    summary: result.summary.map((row) => ({ ...row, value: safe(row.value) })),
    materials: result.materials.map((line) => ({
      ...line,
      quantity: safe(line.quantity),
      unitPrice: line.unitPrice === undefined ? undefined : safe(line.unitPrice),
      cost: line.cost === undefined ? undefined : safe(line.cost),
    })),
    costTotal: safe(result.costTotal),
    scenarios: result.scenarios.map((scenario) => ({
      ...scenario,
      rows: scenario.rows.map((row) => ({ ...row, value: safe(row.value) })),
      totalCost:
        scenario.totalCost === undefined ? undefined : safe(scenario.totalCost),
    })),
  };
}

/* --------------------------------------------------------------- prefill -- */

/**
 * Merge URL query parameters into form values. Anything malformed is ignored
 * rather than allowed to poison the form.
 */
export function applyPrefill(
  def: ProjectDefinition,
  base: InputValues,
  params: Record<string, string | undefined>,
): { values: InputValues; applied: string[] } {
  const values: InputValues = { ...base };
  const applied: string[] = [];

  for (const input of def.inputs) {
    const raw = params[input.id];
    if (raw === undefined || raw === "") continue;

    if (input.type === "number") {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || numeric < 0) continue;
      values[input.id] = numeric;
      applied.push(input.id);
    } else if (input.type === "select") {
      if (input.options.some((option) => option.value === raw)) {
        values[input.id] = raw;
        applied.push(input.id);
      }
    } else if (input.type === "toggle") {
      if (raw === "true" || raw === "false") {
        values[input.id] = raw === "true";
        applied.push(input.id);
      }
    }
  }

  return { values, applied };
}

/** Serialise form values for a shareable URL, skipping defaults. */
export function toQueryParams(
  def: ProjectDefinition,
  values: InputValues,
  system: UnitSystem,
): URLSearchParams {
  const params = new URLSearchParams();
  const defaults = defaultValues(def, system);
  for (const input of def.inputs) {
    const value = values[input.id];
    if (value === undefined || value === "") continue;
    const isDefault =
      input.type === "number"
        ? Number(value) === Number(defaults[input.id])
        : value === defaults[input.id];
    if (isDefault) continue;
    params.set(input.id, String(value));
  }
  if (system !== "us") params.set("units", system);
  return params;
}

export function labelFor(def: ProjectDefinition, id: string): string {
  return def.inputs.find((input) => input.id === id)?.label ?? id;
}

export function inputValueAsNumber(value: InputValue | undefined, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
