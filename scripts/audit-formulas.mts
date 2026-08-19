import { projects } from "../src/data/projects";
import { defaultValues, evaluate } from "../src/lib/calc/engine";

for (const project of projects) {
  const res = evaluate(project, defaultValues(project, "us"), "us");
  if (!res.ok) continue;
  console.log(`\n### ${project.slug}`);
  for (const f of res.result.formulas) {
    console.log(`| ${f.label} | \`${f.expression}\` | ${f.kind} |`);
  }
  console.log("ASSUMPTIONS: " + res.result.assumptions.map((a) => `${a.label}=${a.value}`).join("; "));
}
