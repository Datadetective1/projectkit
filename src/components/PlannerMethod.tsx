import { ChevronDown } from "lucide-react";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import type { ProjectDefinition } from "@/types/project";

/**
 * The planner's method, rendered on the server.
 *
 * The planner itself is a client component behind Suspense, so a crawler that
 * does not execute JavaScript sees an h1, a disclaimer, and the FAQ — and none
 * of the formulas, assumptions, or rounding rules that are the actual substance
 * of the page. An answer engine asked "how do you work out concrete for a
 * patio?" had nothing here to retrieve.
 *
 * This renders the same method as static HTML by running the real calculation
 * at its default values on the server. It is not SEO filler: every figure comes
 * from the same deterministic engine the planner uses, so it cannot drift from
 * what the tool actually does.
 *
 * Framed as the general method rather than a second copy of the user's result.
 * The interactive panel answers "how was *my* number worked out"; this answers
 * "how does this planner work", which is the question someone asks before they
 * have typed anything.
 */
export function PlannerMethod({ project }: { project: ProjectDefinition }) {
  const evaluation = evaluate(project, defaultValues(project, "us"), "us");
  if (!evaluation.ok) return null;

  const result = evaluation.result;
  const quickInputs = project.inputs.filter((input) => input.tier === "quick");

  /*
   * Folded by default. The page used to print this whole method, open, under
   * the planner, and with it the safety notes for the third time (once in the
   * result, once in a "Before you build" box, once here). The result keeps the
   * warnings visible where the number is; this keeps the full method, still in
   * the HTML for crawlers and answer engines, one click away for people.
   */
  return (
    <details className="group pk-card mt-12 max-w-3xl open:pb-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 id="method-heading" className="text-lg font-semibold tracking-tight text-ink">
            How the {project.name.toLowerCase()} calculator works
          </h2>
          <span className="mt-1 block text-sm text-ink-muted">
            Formulas, planning assumptions, safety notes and limits
          </span>
        </div>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-brand transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>

      <div className="border-t border-line px-5 pb-4 pt-5 sm:px-6">
      <p className="pk-prose">
        Every quantity below comes from plain arithmetic run in your browser, not
        from a language model. The formulas and the planning assumptions are
        listed here so you can check them against your own numbers.
      </p>

      <h3 className="mt-8 text-lg font-semibold text-ink">What it needs from you</h3>
      <ul className="pk-prose mt-3 list-disc space-y-1 pl-5">
        {quickInputs.map((input) => (
          <li key={input.id}>
            <strong className="font-medium text-ink">{input.label}</strong>
            {input.type === "number" && input.measure !== "count"
              ? `, in ${input.measure === "inch" ? "inches or centimeters" : "feet or meters"}`
              : null}
          </li>
        ))}
      </ul>
      <p className="pk-prose mt-3 text-sm">
        Waste allowance, prices, and product sizes are all adjustable under
        &ldquo;Customize estimate&rdquo;, and every one of them is shown with the
        value it defaults to.
      </p>

      <h3 className="mt-8 text-lg font-semibold text-ink">How it is calculated</h3>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        {result.formulas.map((formula) => (
          <div key={formula.label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-ink">
              {formula.label}
              <span className="ml-2 text-xs font-normal text-ink-subtle">
                {formula.kind === "math" ? "Exact" : "Assumption"}
              </span>
            </dt>
            <dd className="font-mono text-sm text-ink-muted">{formula.expression}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-8 text-lg font-semibold text-ink">Planning assumptions</h3>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        {result.assumptions.map((assumption) => (
          <div
            key={assumption.label}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
          >
            <dt className="text-sm text-ink-muted">{assumption.label}</dt>
            <dd className="text-sm font-medium text-ink">{assumption.value}</dd>
          </div>
        ))}
      </dl>
      <p className="pk-prose mt-3 text-sm">
        These are the defaults. Each one is editable, and the result updates as
        you change it.
      </p>

      <h3 className="mt-8 text-lg font-semibold text-ink">Before you build</h3>
      <ul className="pk-prose mt-3 list-disc space-y-1.5 pl-5">
        {[...new Set([...(project.disclaimers ?? []), ...result.warnings])].map((note) => (
          <li key={note}>{note}</li>
        ))}
        <li>
          Costs cover materials at the prices shown. Sales tax, delivery, and
          equipment rental are excluded.
        </li>
      </ul>
      </div>
    </details>
  );
}
