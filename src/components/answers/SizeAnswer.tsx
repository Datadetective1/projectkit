import { compute, scenarioSplit, threeNumbers } from "@/lib/answers/compute";
import { BigNumber } from "@/components/answers/AnswerShell";
import { formatMaterialQuantity } from "@/lib/format";
import type { AnswerPage } from "@/types/answer";
import type { Computed } from "@/lib/answers/compute";
import type { ProjectDefinition } from "@/types/project";

/**
 * A "how much do I need for an A × B?" answer.
 *
 * Built around the one thing competing pages get wrong: they give a single
 * number. There are three, they differ by a third, and ordering the first one
 * is how people end up back at the yard mid-pour.
 *
 *   calculated → the geometry
 *   with waste → the planner's allowance applied
 *   order      → rounded to what a supplier actually sells
 *
 * Showing all three is not padding; it is the answer. The gap between the first
 * and the last is the reason to use a calculator at all.
 */
export function SizeAnswer({
  answer,
  project,
  computed,
}: {
  answer: AnswerPage;
  project: ProjectDefinition;
  computed: Computed;
}) {
  const numbers = threeNumbers(computed);
  const { recommended, alternative } = scenarioSplit(computed);

  /*
   * Thickness matters more than anything else on a slab, so a concrete size
   * page carries the variants. Computed, not written — each row is a real
   * evaluation at that thickness.
   */
  const variants =
    project.slug === "concrete-calculator"
      ? [4, 5, 6].map((thickness) => {
          const run = compute(project.slug, { ...answer.values, thickness });
          if (!run) return null;
          const rows = threeNumbers(run);
          return { thickness, ...rows, cost: run.money(run.result.costTotal) };
        })
      : [];

  return (
    <>
      {/* --------------------------------------------------- the answer */}
      <section aria-labelledby="answer-heading">
        <h2 id="answer-heading" className="sr-only">
          The answer
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <BigNumber
            tone="plain"
            label="Calculated"
            value={numbers.calculated ?? "—"}
            note="The geometry alone, with nothing added."
          />
          <BigNumber
            tone="plain"
            label={`Plus ${numbers.wastePct ?? "waste"}`}
            value={numbers.withWaste}
            note="Spillage, uneven ground, and the bits that never make it in."
          />
          <BigNumber
            label="Order this much"
            value={numbers.purchase ?? numbers.withWaste}
            note="Rounded to what a supplier will actually sell you."
          />
        </div>
        <p className="pk-prose mt-4 text-sm">
          {computed.result.explanation[0]}{" "}
          {computed.result.explanation[1]
            ? computed.result.explanation[1]
            : null}
        </p>
      </section>

      {/* ------------------------------------------------- by thickness */}
      {variants.length > 0 ? (
        <section aria-labelledby="thickness-heading">
          <h2
            id="thickness-heading"
            className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
          >
            The same slab at each thickness
          </h2>
          <p className="pk-prose mt-2 text-sm">
            Thickness is the single biggest lever on a slab order, and it is the
            input people are least sure about. Four inches suits a patio or shed
            base; five or six carry vehicles.
          </p>
          {/*
            Focusable, and named.

            The table is wider than a phone, so this container scrolls — and a
            scrollable region with nothing focusable inside it cannot be reached
            by keyboard at all. axe flags it as `scrollable-region-focusable`,
            and it is right: without a tab stop the only way to read the
            right-hand columns is to touch the screen.
          */}
          <div
            className="mt-4 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="The same slab at each thickness"
          >
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left">
                  <th
                    scope="col"
                    className="py-2 pr-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle"
                  >
                    Thickness
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle"
                  >
                    Calculated
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle"
                  >
                    With waste
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle"
                  >
                    Order
                  </th>
                  <th
                    scope="col"
                    className="py-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle"
                  >
                    Materials
                  </th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) =>
                  variant ? (
                    <tr
                      key={variant.thickness}
                      className="border-b border-line last:border-0"
                    >
                      <th
                        scope="row"
                        className="py-2.5 pr-3 text-left font-medium text-ink"
                      >
                        {variant.thickness} in
                      </th>
                      <td className="py-2.5 pr-3 tabular-nums text-ink-muted">
                        {variant.calculated}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-ink-muted">
                        {variant.withWaste}
                      </td>
                      <td className="py-2.5 pr-3 font-medium tabular-nums text-ink">
                        {variant.purchase}
                      </td>
                      <td className="py-2.5 tabular-nums text-ink-muted">
                        {variant.cost}
                      </td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------- everything else */}
      <section aria-labelledby="materials-heading">
        <h2
          id="materials-heading"
          className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
        >
          What else the job needs
        </h2>
        <p className="pk-prose mt-2 text-sm">
          The headline figure is one line on a receipt. These are the rest, at
          the same dimensions.
        </p>
        <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {computed.result.materials.map((material) => (
            <li
              key={material.id}
              className="flex items-baseline justify-between gap-4 px-4 py-2.5"
            >
              <span className="min-w-0 text-sm text-ink">
                {material.name}
                {material.optional ? (
                  <span className="ml-1.5 text-xs text-ink-subtle">
                    optional
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm font-medium tabular-nums text-ink">
                  {formatMaterialQuantity(material, "us")}
                </span>
                {material.cost != null ? (
                  <span className="block text-xs tabular-nums text-ink-muted">
                    {computed.money(material.cost)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-4 bg-surface-sunken/60 px-4 py-3">
            <span className="text-sm font-semibold text-ink">
              Estimated materials
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-ink">
              {computed.money(computed.result.costTotal)}
            </span>
          </li>
        </ul>
        <p className="pk-prose mt-2 text-xs">
          Planning prices, editable in the planner. Excludes tax, delivery, tool
          hire and labour.
        </p>
      </section>

      {/* ----------------------------------------------- the comparison */}
      {recommended && alternative ? (
        <section aria-labelledby="options-heading">
          <h2
            id="options-heading"
            className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
          >
            Two ways to buy it
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[recommended, alternative].map((scenario) => (
              <div
                key={scenario.id}
                className={`rounded-[var(--radius-card)] border p-4 ${
                  scenario.recommended
                    ? "border-brand/35 bg-brand-soft/40"
                    : "border-line bg-surface"
                }`}
              >
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle">
                  {scenario.recommended ? "Recommended here" : "Alternative"}
                </p>
                <h3 className="mt-1.5 text-base font-semibold text-ink">
                  {scenario.name}
                </h3>
                <p className="mt-1.5 text-xl font-semibold tabular-nums text-ink">
                  {computed.money(scenario.totalCost)}
                </p>
                <p className="pk-prose mt-1.5 text-sm leading-snug">
                  {scenario.summary}
                </p>
              </div>
            ))}
          </div>
          {computed.result.explanation[2] ? (
            <p className="pk-prose mt-3 text-sm">
              {computed.result.explanation[2]}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
