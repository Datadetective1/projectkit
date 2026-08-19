import { projects } from "../src/data/projects";
import { defaultValues, evaluate } from "../src/lib/calc/engine";

/** Every imperial unit that could leak into metric-mode prose. */
const IMPERIAL = /\b(sq ft|cu ft|yd³|cubic yards?|square feet|linear ft|feet|foot|inch(es)?|\d+\s*(ft|in|lb|lbs)\b|tons?|gallons?)\b/i;

for (const project of projects) {
  const res = evaluate(project, defaultValues(project, "metric"), "metric");
  if (!res.ok) continue;
  const r = res.result;

  const fields: [string, string][] = [
    ...r.materials.flatMap((m): [string, string][] => [
      [`material.${m.id}.name`, m.name],
      ...(m.note ? ([[`material.${m.id}.note`, m.note]] as [string, string][]) : []),
    ]),
    ...r.assumptions.map((a): [string, string] => [`assumption.${a.label}`, `${a.label}: ${a.value}`]),
    ...r.explanation.map((e, i): [string, string] => [`explanation[${i}]`, e]),
    ...r.formulas.map((f): [string, string] => [`formula.${f.label}`, f.expression]),
    ...r.scenarios.flatMap((s): [string, string][] => [[`scenario.${s.id}`, s.summary]]),
    ...r.summary.filter((s) => s.note).map((s): [string, string] => [`summary.${s.label}.note`, s.note!]),
    [`headline.sublabel`, r.headline.sublabel ?? ""],
  ];

  const hits = fields.filter(([, text]) => IMPERIAL.test(text));
  if (!hits.length) { console.log(`ok  ${project.slug}`); continue; }
  console.log(`\n${project.slug}`);
  for (const [where, text] of hits) console.log(`   ${where.padEnd(34)} ${text}`);
}
