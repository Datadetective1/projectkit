/**
 * Unit engine.
 *
 * ProjectKit runs every calculation in a single canonical system (US customary:
 * feet, inches, square feet, cubic feet/yards, short tons). Metric values are
 * converted to canonical on the way in and back to metric on the way out, so a
 * formula is only ever written once and only ever tested once.
 */

export type UnitSystem = "us" | "metric";

export type Measure =
  | "length" // ft ↔ m
  | "inch" // in ↔ cm
  | "area" // sq ft ↔ m²
  | "volumeFt" // cu ft ↔ m³
  | "volumeYd" // cu yd ↔ m³
  | "weight" // short tons ↔ tonnes
  | "percent"
  | "currency"
  | "count";

/** Multiply a canonical (US) value by this to get the metric value. */
const TO_METRIC: Record<Measure, number> = {
  length: 0.3048, // ft → m
  inch: 2.54, // in → cm
  area: 0.09290304, // sq ft → m²
  volumeFt: 0.028316846592, // cu ft → m³
  volumeYd: 0.764554857984, // cu yd → m³
  weight: 0.90718474, // short ton → tonne
  percent: 1,
  currency: 1,
  count: 1,
};

const UNIT_LABELS: Record<Measure, { us: string; metric: string }> = {
  length: { us: "ft", metric: "m" },
  inch: { us: "in", metric: "cm" },
  area: { us: "sq ft", metric: "m²" },
  volumeFt: { us: "cu ft", metric: "m³" },
  volumeYd: { us: "yd³", metric: "m³" },
  weight: { us: "tons", metric: "t" },
  percent: { us: "%", metric: "%" },
  currency: { us: "$", metric: "$" },
  count: { us: "", metric: "" },
};

/** Spoken-word unit names, used in explanations and the Project Pack. */
const UNIT_NAMES: Record<Measure, { us: string; metric: string }> = {
  length: { us: "feet", metric: "meters" },
  inch: { us: "inches", metric: "centimeters" },
  area: { us: "square feet", metric: "square meters" },
  volumeFt: { us: "cubic feet", metric: "cubic meters" },
  volumeYd: { us: "cubic yards", metric: "cubic meters" },
  weight: { us: "tons", metric: "tonnes" },
  percent: { us: "percent", metric: "percent" },
  currency: { us: "dollars", metric: "dollars" },
  count: { us: "", metric: "" },
};

export function unitLabel(measure: Measure, system: UnitSystem): string {
  return UNIT_LABELS[measure][system];
}

export function unitName(measure: Measure, system: UnitSystem): string {
  return UNIT_NAMES[measure][system];
}

/** Convert a value shown in `system` into the canonical US value. */
export function toCanonical(
  value: number,
  measure: Measure,
  system: UnitSystem,
): number {
  if (system === "us") return value;
  return value / TO_METRIC[measure];
}

/** Convert a canonical US value into the value to display in `system`. */
export function fromCanonical(
  value: number,
  measure: Measure,
  system: UnitSystem,
): number {
  if (system === "us") return value;
  return value * TO_METRIC[measure];
}

/**
 * Round a display value to a sensible number of decimals for its measure.
 * Deliberately conservative: material planning does not benefit from six
 * decimal places of fake precision.
 */
export function defaultPrecision(measure: Measure): number {
  switch (measure) {
    case "count":
      return 0;
    case "currency":
      return 2;
    case "percent":
      return 0;
    case "area":
      return 0;
    case "length":
    case "inch":
      return 2;
    case "volumeFt":
      return 1;
    case "volumeYd":
    case "weight":
      return 2;
    default:
      return 2;
  }
}

export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  // Nudge away from binary representation errors before rounding (0.145 → 0.15).
  return Math.round((value + Number.EPSILON * Math.abs(value)) * factor) / factor;
}

/** Round up to the next multiple of `step` (e.g. concrete ordered per ¼ yd³). */
export function roundUpTo(value: number, step: number): number {
  if (step <= 0) return value;
  if (!Number.isFinite(value)) return 0;
  const steps = Math.ceil(roundTo(value / step, 6));
  return roundTo(steps * step, 6);
}

const NUMBER_FORMATTERS = new Map<string, Intl.NumberFormat>();

function numberFormatter(min: number, max: number): Intl.NumberFormat {
  const key = `${min}:${max}`;
  let formatter = NUMBER_FORMATTERS.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
    NUMBER_FORMATTERS.set(key, formatter);
  }
  return formatter;
}

export function formatNumber(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) return "—";
  const d = decimals ?? 2;
  // Whole numbers read better without trailing zeros ("320 sq ft", not "320.00").
  const isWhole = Math.abs(value - Math.round(value)) < 1e-9;
  return numberFormatter(isWhole ? 0 : d, d).format(value);
}

export function formatCurrency(value: number, currency = "USD"): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
    minimumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export interface FormatQuantityOptions {
  system: UnitSystem;
  precision?: number;
  /** Overrides the derived unit label (e.g. "bags", "sheets", "boxes"). */
  unitOverride?: string;
}

/** Format a canonical value for display, converting units as needed. */
/**
 * Translate the unit inside a custom label into the reader's system.
 *
 * A `unitOverride` exists to add a word the plain unit label cannot carry —
 * "linear ft", "linear ft of decking", "sq ft / box". The value beside it is
 * always converted, so a hardcoded imperial label silently mislabels it: form
 * boards showed "24 linear ft" in metric mode when the real figure was 79 ft
 * and 24 was the metre count. A reader would have bought a third of the timber
 * they needed.
 *
 * Only the measure's own unit token is swapped, so surrounding words survive
 * and a label that names no unit ("bags", "posts") passes straight through.
 */
function localiseOverride(
  unitOverride: string | undefined,
  measure: Measure,
  system: UnitSystem,
): string {
  if (unitOverride === undefined) return unitLabel(measure, system);
  if (system === "us") return unitOverride;

  const from = UNIT_LABELS[measure].us;
  const to = UNIT_LABELS[measure].metric;
  if (!from || from === to) return unitOverride;

  // Word-bounded so "ft" does not match inside another word.
  return unitOverride.replace(new RegExp(`(^|[\\s/])${escapeForRegExp(from)}(?=$|[\\s/])`, "g"), `$1${to}`);
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * "1 bags" and "1 rolls" read as sloppiness on a page whose whole job is to be
 * trusted with numbers. Counted things get singularised at exactly one.
 *
 * Only the leading word changes, so "2 boxes (1 lb)" becomes "1 box (1 lb)"
 * rather than mangling the parenthetical. Applied to `count` alone — "1 sq ft"
 * and "1 linear ft" are already correct and must not be touched.
 */
function singularise(label: string): string {
  const [head, ...rest] = label.split(" ");
  if (!head || !head.endsWith("s") || head.endsWith("ss")) return label;
  const singular = /(?:ch|sh|s|x|z)es$/.test(head) ? head.slice(0, -2) : head.slice(0, -1);
  return [singular, ...rest].join(" ");
}

export function formatQuantity(
  canonicalValue: number,
  measure: Measure,
  options: FormatQuantityOptions,
): string {
  const { system, precision, unitOverride } = options;
  if (measure === "currency") return formatCurrency(canonicalValue);

  const displayValue = fromCanonical(canonicalValue, measure, system);
  const decimals = precision ?? defaultPrecision(measure);
  const rawLabel = localiseOverride(unitOverride, measure, system);
  const label =
    measure === "count" && displayValue === 1 ? singularise(rawLabel) : rawLabel;
  const formatted = formatNumber(displayValue, decimals);
  if (!label) return formatted;
  if (label === "%") return `${formatted}%`;
  return `${formatted} ${label}`;
}

/**
 * Purchase increments differ by system: ready-mix is ordered per quarter cubic
 * yard in the US and per tenth of a cubic meter in most metric markets.
 */
export function bulkPurchaseStep(measure: Measure, system: UnitSystem): number {
  if (measure === "volumeYd") return system === "us" ? 0.25 : toCanonical(0.1, measure, system);
  if (measure === "weight") return system === "us" ? 0.25 : toCanonical(0.25, measure, system);
  return 0;
}
