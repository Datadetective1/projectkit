import { projects } from "../src/data/projects";
import { defaultValues, evaluate } from "../src/lib/calc/engine";
import { formatMaterialQuantity, formatRow, formatUnitPrice } from "../src/lib/format";
import { formatQuantity } from "../src/lib/units";

for (const project of projects) {
  const res = evaluate(project, defaultValues(project, "metric"), "metric");
  if (!res.ok) { console.log(`FAIL ${project.slug}`); continue; }
  const r = res.result;
  console.log(`\n########## ${project.slug} (metric) ##########`);
  console.log(`  HEADLINE  ${formatQuantity(r.headline.value, r.headline.measure, { system: "metric", precision: r.headline.precision, unitOverride: r.headline.unitOverride })}`);
  console.log(`            ${r.headline.sublabel ?? ""}`);
  for (const row of r.summary) console.log(`  SUMMARY   ${row.label.padEnd(28)} ${formatRow(row, "metric")}`);
  for (const m of r.materials) {
    console.log(`  MATERIAL  ${m.name.padEnd(42)} ${formatMaterialQuantity(m, "metric").padEnd(16)} ${m.unitPrice !== undefined ? formatUnitPrice(m, "metric") : ""}`);
    if (m.note) console.log(`            ↳ ${m.note}`);
  }
  for (const e of r.explanation) console.log(`  EXPLAIN   ${e}`);
  for (const f of r.formulas) console.log(`  FORMULA   ${f.label.padEnd(20)} ${f.expression}`);
  for (const a of r.assumptions) console.log(`  ASSUME    ${a.label.padEnd(20)} ${a.value}`);
  for (const sc of r.scenarios) console.log(`  SCENARIO  ${sc.name} — ${sc.summary}`);
}
