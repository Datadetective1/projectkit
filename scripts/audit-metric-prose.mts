import { projects } from "../src/data/projects";
import { defaultValues, evaluate } from "../src/lib/calc/engine";
import {
  imperialLeaks,
  prosePassages,
  productSpecExemption,
  IMPERIAL_UNIT,
} from "../tests/support/imperialUnits";

/**
 * Imperial units surviving into metric-mode prose.
 *
 * The calculators convert every number. Before src/lib/calc/describe.ts existed
 * they wrote the unit *word* by hand, so a metric reader was told "a 111 m² bed
 * at 3 in deep" — half converted, half not. There were about sixty of those.
 *
 * The detection rule lives in tests/support/imperialUnits.ts, shared with the
 * matrix test that gates it. This script is the exploratory view: it prints the
 * exemptions it applied, which the test has no reason to.
 *
 * Exits non-zero on a real finding, so it can gate a build.
 */

let realFindings = 0;
const exemptions = new Map<string, number>();

for (const project of projects) {
  const evaluation = evaluate(project, defaultValues(project, "metric"), "metric");
  if (!evaluation.ok) {
    console.log(`FAILED  ${project.slug}`);
    realFindings++;
    continue;
  }

  for (const [, text] of prosePassages(evaluation.result)) {
    if (!IMPERIAL_UNIT.test(text)) continue;
    const spec = productSpecExemption(text);
    if (spec) exemptions.set(spec.why, (exemptions.get(spec.why) ?? 0) + 1);
  }

  const leaks = imperialLeaks(evaluation.result);
  if (leaks.length === 0) {
    console.log(`ok   ${project.slug}`);
    continue;
  }
  realFindings += leaks.length;
  console.log(`\nFAIL ${project.slug}`);
  for (const [where, text] of leaks) console.log(`   ${where.padEnd(34)} ${text}`);
}

console.log(
  `\n${realFindings} imperial unit${realFindings === 1 ? "" : "s"} in metric prose.`,
);
if (exemptions.size > 0) {
  console.log("\nAllowed as product specifications:");
  for (const [why, count] of [...exemptions].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)} × ${why}`);
  }
}
process.exit(realFindings > 0 ? 1 : 0);
