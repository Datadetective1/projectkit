import { projects } from "../src/data/projects";
import { defaultValues, evaluate } from "../src/lib/calc/engine";

for (const project of projects) {
  const values = defaultValues(project, "us");
  const res = evaluate(project, values, "us");
  if (!res.ok) { console.log(`${project.slug}: FAILED`); continue; }
  const r = res.result;
  console.log(`\n########## ${project.slug} ##########`);
  console.log("-- SHOPPING EXTRAS --");
  for (const item of r.shoppingExtras) console.log(`   [${item.optional ? "opt" : "req"}] ${item.label}`);
  console.log("-- STEPS --");
  project.steps.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));
  console.log("-- WARNINGS --");
  for (const w of r.warnings) console.log(`   ! ${w}`);
  console.log("-- EFFORT --");
  console.log(`   ${r.effort.difficulty} / ${r.effort.timeCategory}`);
  for (const n of r.effort.notes ?? []) console.log(`   - ${n}`);
}
