/**
 * Calculation audit harness.
 *
 * Dumps every project's full result at a set of probe inputs so the numbers can
 * be checked by hand against independently derived figures. Not a test — a
 * inspection tool for the pre-launch audit. Run with:
 *
 *   npx tsx scripts/audit-calculations.mts
 */
import { projects, getProjectOrThrow } from "../src/data/projects/index.js";
import { defaultValues, evaluate } from "../src/lib/calc/engine.js";
import { formatQuantity } from "../src/lib/units.js";
import type { InputValues } from "../src/types/project.js";
import type { UnitSystem } from "../src/lib/units.js";

function run(slug: string, overrides: InputValues = {}, system: UnitSystem = "us") {
  const project = getProjectOrThrow(slug);
  const values = { ...defaultValues(project, system), ...overrides };
  const result = evaluate(project, values, system);
  if (!result.ok) {
    console.log(`  !! evaluate failed: ${result.message ?? JSON.stringify(result.errors)}`);
    return;
  }
  const r = result.result;
  const fmt = (v: number, m: Parameters<typeof formatQuantity>[1], p?: number) =>
    formatQuantity(v, m, { system, precision: p });

  console.log(`  HEADLINE  ${fmt(r.headline.value, r.headline.measure, r.headline.precision)}`);
  if (r.headline.sublabel) console.log(`            ${r.headline.sublabel}`);
  for (const row of r.summary) {
    console.log(
      `  SUMMARY   ${row.label.padEnd(30)} ${formatQuantity(row.value, row.measure, { system, precision: row.precision, unitOverride: row.unitOverride })}`,
    );
  }
  for (const m of r.materials) {
    console.log(
      `  MATERIAL  ${m.name.slice(0, 42).padEnd(44)} ${formatQuantity(m.quantity, m.measure, { system, precision: m.precision, unitOverride: m.unitOverride })}${m.cost !== undefined ? `  $${m.cost}` : ""}${m.isEstimate ? "  [est]" : ""}`,
    );
  }
  console.log(`  COST      $${r.costTotal}`);
}

const probes: { label: string; slug: string; values?: InputValues; system?: UnitSystem }[] = [
  { label: "concrete 20x16x4in waste0", slug: "concrete-calculator", values: { length: 20, width: 16, thickness: 4, waste: 0, baseDepth: 0 } },
  { label: "concrete defaults", slug: "concrete-calculator" },
  { label: "fence 75x110 6ft 1 gate", slug: "fence-calculator" },
  { label: "paint 12x12x8 2 coats", slug: "paint-calculator", values: { length: 12, width: 12, height: 8, coats: 2, rooms: 1, doors: 1, windows: 2 } },
  { label: "flooring 15x12 10% 24sqft/box", slug: "flooring-calculator" },
  { label: "mulch 40x30 3in", slug: "mulch-calculator" },
  { label: "gravel 40x12 4in", slug: "gravel-calculator" },
  { label: "drywall 14x12x8 +ceiling", slug: "drywall-calculator" },
  { label: "tile 10x8 12x12in", slug: "tile-calculator" },
  { label: "deck 16x12", slug: "deck-calculator" },
  { label: "sod 50x30", slug: "sod-calculator" },
];

for (const probe of probes) {
  console.log(`\n=== ${probe.label} (${probe.system ?? "us"}) ===`);
  run(probe.slug, probe.values, probe.system);
}

console.log("\n\n########## METRIC PARITY (defaults in each system) ##########");
for (const project of projects) {
  const us = evaluate(project, defaultValues(project, "us"), "us");
  const me = evaluate(project, defaultValues(project, "metric"), "metric");
  if (!us.ok || !me.ok) { console.log(`${project.slug}: FAILED`); continue; }
  const delta = Math.abs(us.result.headline.value - me.result.headline.value);
  const rel = us.result.headline.value === 0 ? 0 : delta / us.result.headline.value;
  console.log(
    `${project.slug.padEnd(24)} us=${us.result.headline.value.toFixed(4)}  metric=${me.result.headline.value.toFixed(4)}  reldiff=${(rel * 100).toFixed(4)}%  ${rel > 0.001 ? "<<< MISMATCH" : ""}`,
  );
}
