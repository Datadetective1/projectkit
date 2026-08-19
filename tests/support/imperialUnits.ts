import type { CalculationResult } from "@/types/project";

/**
 * One definition of "this is an imperial unit leaking into metric output".
 *
 * Shared by `tests/unit/calculations.matrix.test.ts` and
 * `scripts/audit-metric-prose.mts` so the gate and the exploratory tool cannot
 * drift apart — a rule that two places define twice is a rule that gets
 * relaxed in one of them.
 */

/*
 * Every alternative carries its own word boundary. Without a trailing one,
 * "foot" matches inside "footing" and every deck warning about footing sizes
 * reads as a unit bug, which buries the real findings in noise.
 */
export const IMPERIAL_UNIT = new RegExp(
  [
    "sq ft",
    "cu ft",
    "cubic yards?",
    /*
     * A bare "yard" needs a unit context. Without one this matches the
     * "Yard & Garden" category on three planners, which is a garden rather
     * than 0.9144 m.
     */
    String.raw`(?:per|a|one|\d+(?:\.\d+)?) yards?`,
    "cubic (foot|feet)",
    "square (foot|feet)",
    "linear ft",
    "feet",
    "foot",
    "inch(es)?",
    "gallons?",
    "quarts?",
    "tons?",
    String.raw`\d+(\.\d+)?\s*(ft|in|lb|lbs|gal)`,
  ]
    .map((alternative) => String.raw`\b(?:${alternative})\b`)
    // "yd³" ends in a superscript, which is not a word character, so a trailing
    // \b could never match after it.
    .concat(["yd³"])
    .join("|"),
  "i",
);

/**
 * Text that is *meant* to stay imperial, because it names a product rather than
 * a measurement.
 *
 * A metric reader hunting a 50 lb bag of thinset or a 4 × 8 ft sheet is better
 * served by the name on the packaging than by a conversion — "22.68 kg bag"
 * does not appear on any shelf. Each entry is narrow on purpose: this is an
 * allowlist, not a mute button.
 */
export const PRODUCT_SPECS: { pattern: RegExp; why: string }[] = [
  { pattern: /\b\d+(\.\d+)?\s*lb\s+bag\b/i, why: "bag size printed on the packaging" },
  { pattern: /\(\s*\d+(\.\d+)?\s*lb\s*\)/i, why: "package weight in a product name" },
  { pattern: /\bcu ft\s+(per bag|yield)\b/i, why: "bag yield printed on the packaging" },
  { pattern: /^Bag size:/i, why: "bag size printed on the packaging" },
  // The pack renders an assumption label and its value on separate rows, so
  // the bag-size value arrives on its own as a bare "2 cu ft".
  { pattern: /^\d+(\.\d+)?\s*cu ft$/i, why: "bag size printed on the packaging" },
  { pattern: /\b\d+\s*×\s*\d+\s*ft\b/i, why: "nominal sheet size, the name you ask for" },
  { pattern: /notch\b/i, why: "trowel size, a tool specification" },
  { pattern: /\bwith A, B, and thickness in inches\b/i, why: "formula states its own input units" },
  { pattern: /\bin bags\b/i, why: "'in' as a preposition, not inches" },
  { pattern: /\ba US quart\b/i, why: "names the imperial increment it converts from" },
  { pattern: /\(\s*\d+(\.\d+)?\s*gal\s*\)/i, why: "bucket size printed on the packaging" },
  { pattern: /\(\s*\d+\s*ft\s*\)/i, why: "roll length printed on the packaging" },
];

export function productSpecExemption(text: string) {
  return PRODUCT_SPECS.find((spec) => spec.pattern.test(text));
}

/**
 * Every string a calculation puts in front of a reader, labelled by where it
 * came from so a failure names the field rather than just the sentence.
 *
 * Quantities are excluded — those are covered by the rendering assertions in
 * the matrix test, which compare formatted output rather than raw prose.
 */
export function prosePassages(result: CalculationResult): [string, string][] {
  return [
    ...result.materials.flatMap((line): [string, string][] => [
      [`material.${line.id}.name`, line.name],
      ...(line.note ? ([[`material.${line.id}.note`, line.note]] as [string, string][]) : []),
    ]),
    ...result.assumptions.map(
      (item): [string, string] => [`assumption.${item.label}`, `${item.label}: ${item.value}`],
    ),
    ...result.explanation.map((text, i): [string, string] => [`explanation[${i}]`, text]),
    ...result.formulas.map((item): [string, string] => [`formula.${item.label}`, item.expression]),
    ...result.scenarios.flatMap((scenario): [string, string][] => [
      [`scenario.${scenario.id}.name`, scenario.name],
      [`scenario.${scenario.id}.summary`, scenario.summary],
    ]),
    ...result.summary
      .filter((row) => row.note)
      .map((row): [string, string] => [`summary.${row.label}.note`, row.note!]),
    ...result.warnings.map((text, i): [string, string] => [`warning[${i}]`, text]),
    ...(result.effort.notes ?? []).map(
      (text, i): [string, string] => [`effort.notes[${i}]`, text],
    ),
    ["headline.sublabel", result.headline.sublabel ?? ""],
  ];
}

/** The passages that genuinely leak, with product specs filtered out. */
export function imperialLeaks(result: CalculationResult): [string, string][] {
  return prosePassages(result).filter(
    ([, text]) => IMPERIAL_UNIT.test(text) && !productSpecExemption(text),
  );
}
