"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import { formatRow } from "@/lib/format";
import { formatCurrency, formatQuantity, type UnitSystem } from "@/lib/units";
import type { CalculationResult, ResultRow } from "@/types/project";

interface ResultsPanelProps {
  result: CalculationResult;
  system: UnitSystem;
  /**
   * Bumped when the user presses "Calculate my project". Used as a React key so
   * the headline remounts and replays its settle animation.
   */
  revealKey?: number;
  /** What to do next, rendered between the headline and everything else. */
  nextStep?: React.ReactNode;
  /**
   * Materials and shopping, as one section.
   *
   * Passed in rather than built here because it needs the planner's checklist
   * state and scroll target. This component used to render a separate
   * "Materials" table immediately above it, listing the same lines with the
   * same quantities; the two were merged because the second was not answering a
   * new question.
   */
  shoppingList?: React.ReactNode;
  /** A picture of the project (the 3D model), shown beside the answer. */
  visual?: React.ReactNode;
}

/**
 * The result, in the order somebody actually needs it.
 *
 * ANSWER, then what to do about it, then what to buy, then — only for people
 * who want it — why the number is what it is. The panel used to run headline,
 * project summary, materials, options, meaning, formulas, which meant the
 * quantity a person had just read was restated three more times before they
 * reached anything they could act on.
 */
export function ResultsPanel({
  result,
  system,
  revealKey = 0,
  nextStep,
  shoppingList,
  visual,
}: ResultsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* ANSWER */}
      <Headline result={result} system={system} revealKey={revealKey} visual={visual} />

      {/* ACTION */}
      {nextStep}

      {/* MATERIALS + SHOPPING, one section */}
      {shoppingList}

      {/* DECISION SUPPORT */}
      {result.scenarios.length > 0 ? <ScenariosCard result={result} system={system} /> : null}
      <WhyThisNumber result={result} system={system} />
    </div>
  );
}

function Headline({
  result,
  system,
  revealKey,
  visual,
}: {
  result: CalculationResult;
  system: UnitSystem;
  revealKey: number;
  visual?: React.ReactNode;
}) {
  const { headline } = result;
  const formatted =
    headline.measure === "currency"
      ? formatCurrency(headline.value)
      : formatQuantity(headline.value, headline.measure, {
          system,
          precision: headline.precision,
          unitOverride: headline.unitOverride,
        });

  return (
    <section
      aria-labelledby="result-headline"
      className={`pk-result-hero relative overflow-hidden rounded-[var(--radius-card)] border border-brand/20 bg-brand-soft ${
        visual ? "grid items-center sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : "p-5 sm:p-7"
      }`}
    >
      <div className={visual ? "p-5 pb-0 sm:p-7 sm:pr-2" : undefined}>
      <h2
        id="result-headline"
        className="text-sm font-semibold uppercase tracking-wide text-brand-ink/70"
      >
        {headline.label}
      </h2>
      <p
        key={`${revealKey}-${formatted}`}
        className="pk-settle mt-2 text-[2.125rem] font-semibold leading-tight tracking-tight text-brand-ink sm:text-5xl"
        aria-live="polite"
      >
        {formatted}
      </p>
      {headline.sublabel ? (
        <p
          key={`sub-${revealKey}-${headline.sublabel}`}
          className="pk-settle-delayed mt-2 text-sm text-brand-ink/80 sm:text-base"
        >
          {headline.sublabel}
        </p>
      ) : null}
      </div>
      {visual}
    </section>
  );
}

/**
 * Whether a summary row is just the headline again.
 *
 * Every planner ends its summary with an emphasised "Recommended purchase" row
 * carrying exactly the value the headline states in 48px type directly above —
 * concrete's 4.50 yd³, mulch's 11.75 yd³, paint's 2 gal. Dropping it by
 * comparing the numbers, rather than by matching a label, means a planner that
 * later emphasises something genuinely different keeps its row.
 */
function restatesHeadline(row: ResultRow, result: CalculationResult): boolean {
  const { headline } = result;
  if (row.measure !== headline.measure) return false;
  // Both are rounded for display; compare at display precision, not exactly.
  return Math.abs(row.value - headline.value) < 0.005;
}

/**
 * Why the number is what it is.
 *
 * Three sections used to answer this one question separately: a "Project
 * summary" table of the derivation, a "What this means" prose explanation, and
 * a collapsed "How this was calculated" holding formulas and assumptions. They
 * are one question, so they are one section — the numbers, the sentence that
 * interprets them, and the arithmetic behind a disclosure for anyone who wants
 * to check it.
 *
 * The warnings stay visible rather than collapsing with the formulas. Several
 * are safety-critical — wet concrete burns skin it sits against, pre-1978 paint
 * may be lead — and page length is not a reason to hide those.
 */
function WhyThisNumber({ result, system }: { result: CalculationResult; system: UnitSystem }) {
  const [open, setOpen] = useState(false);
  const rows = result.summary.filter((row) => !restatesHeadline(row, result));

  return (
    <section aria-labelledby="result-meaning" className="pk-card overflow-hidden">
      <div className="p-5 sm:p-6">
        <h2 id="result-meaning" className="text-lg font-semibold text-ink">
          Why this number
        </h2>

        {rows.length > 0 ? (
          <dl className="mt-4 divide-y divide-line border-y border-line">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
              >
                <dt className="text-sm text-ink-muted">
                  {row.label}
                  {row.note ? (
                    <span className="block text-xs text-ink-subtle">{row.note}</span>
                  ) : null}
                </dt>
                <dd className="text-right text-sm font-medium tabular-nums text-ink">
                  {formatRow(row, system)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="pk-prose mt-4 space-y-3 text-sm sm:text-[0.9375rem]">
          {result.explanation.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {result.warnings.length > 0 ? (
          <ul className="mt-5 space-y-2.5">
            {result.warnings.map((warning, index) => (
              <li
                key={index}
                className="flex gap-2.5 rounded-lg bg-accent-soft p-3 text-sm text-ink"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <h3 className="border-t border-line">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="how-calculated"
          className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-ink">
            <Info className="h-4 w-4 text-brand" aria-hidden />
            The arithmetic and the assumptions
          </span>
          <ChevronDown
            aria-hidden
            className={`h-5 w-5 shrink-0 text-ink-subtle transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h3>

      {open ? (
        <div id="how-calculated" className="border-t border-line p-5 sm:p-6">
          <dl className="space-y-2.5">
            {result.formulas.map((formula) => (
              <div key={formula.label} className="sm:flex sm:gap-4">
                <dt className="flex items-center gap-2 text-sm font-medium text-ink sm:w-44 sm:shrink-0">
                  {formula.label}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${
                      formula.kind === "math"
                        ? "bg-brand-soft text-brand-ink"
                        : "bg-accent-soft text-accent"
                    }`}
                  >
                    {formula.kind === "math" ? "Exact" : "Assumption"}
                  </span>
                </dt>
                <dd className="font-mono text-sm text-ink-muted">{formula.expression}</dd>
              </div>
            ))}
          </dl>

          <h4 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Planning assumptions
          </h4>
          <dl className="mt-3 divide-y divide-line">
            {result.assumptions.map((assumption) => (
              <div key={assumption.label} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="text-ink-muted">{assumption.label}</dt>
                <dd className="text-right font-medium text-ink">{assumption.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-xs text-ink-subtle">
            Every one of these is editable under &ldquo;Customize estimate&rdquo;, and the result
            updates as you change it. Prices are your own entries or Cubitora planning defaults, not
            live retail prices.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The alternatives, and what differs between them.
 *
 * The recommended scenario is the number already shown at the top of the page,
 * so it is labelled as such rather than presented as news. What earns the space
 * is the comparison: bulk versus bags, one coat versus two.
 */
function ScenariosCard({ result, system }: { result: CalculationResult; system: UnitSystem }) {
  return (
    <section aria-labelledby="result-scenarios" className="pk-card p-5 sm:p-6">
      <h2 id="result-scenarios" className="text-lg font-semibold text-ink">
        Compare your options
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {result.scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`rounded-xl border p-4 ${
              scenario.recommended
                ? "border-brand/30 bg-brand-soft/50"
                : "border-line bg-surface-sunken/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-ink">{scenario.name}</h3>
              {scenario.recommended ? (
                <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">
                  Your estimate
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-ink-muted">{scenario.summary}</p>
            <dl className="mt-3 space-y-1.5">
              {scenario.rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-ink-muted">{row.label}</dt>
                  <dd className="tabular-nums font-medium text-ink">{formatRow(row, system)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
