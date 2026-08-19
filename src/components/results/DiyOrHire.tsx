"use client";

import { useId } from "react";
import { formatCurrency } from "@/lib/units";
import { features } from "@/config/site";
import type { CalculationResult } from "@/types/project";

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "bg-brand-soft text-brand-ink",
  Moderate: "bg-accent-soft text-accent",
  Challenging: "bg-danger-soft text-danger",
};

/**
 * DIY-vs-contractor comparison.
 *
 * Deliberately does not invent local labour rates — the contractor number is
 * whatever quote the user types in.
 */
export function DiyOrHire({
  result,
  quote,
  onQuoteChange,
}: {
  result: CalculationResult;
  quote: number | "";
  onQuoteChange: (value: number | "") => void;
}) {
  const fieldId = useId();
  const numericQuote = typeof quote === "number" ? quote : Number(quote);
  const hasQuote = Number.isFinite(numericQuote) && numericQuote > 0;
  const difference = hasQuote ? numericQuote - result.costTotal : 0;

  return (
    <section aria-labelledby="diy-or-hire" className="pk-card p-5 sm:p-6">
      <h2 id="diy-or-hire" className="text-lg font-semibold text-ink">
        DIY or hire someone?
      </h2>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-sunken/60 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Estimated materials
          </dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">
            {formatCurrency(result.costTotal)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-sunken/60 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Complexity
          </dt>
          <dd className="mt-1">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${
                DIFFICULTY_STYLES[result.effort.difficulty] ?? "bg-surface-sunken text-ink"
              }`}
            >
              {result.effort.difficulty}
            </span>
          </dd>
        </div>
        <div className="rounded-xl bg-surface-sunken/60 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Rough time
          </dt>
          <dd className="mt-1 text-sm font-medium text-ink">{result.effort.timeCategory}</dd>
        </div>
      </dl>

      <div className="mt-5 rounded-xl border border-line p-4">
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
          Have a contractor quote? Enter it to compare.
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-48">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-subtle"
            >
              $
            </span>
            <input
              id={fieldId}
              type="text"
              inputMode="decimal"
              placeholder="0"
              className="pk-field pl-7"
              value={quote === "" ? "" : String(quote)}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "") return onQuoteChange("");
                if (/^\d*\.?\d*$/.test(next)) onQuoteChange(Number(next));
              }}
            />
          </div>
          {hasQuote ? (
            <p className="text-sm text-ink" aria-live="polite">
              {difference > 0 ? (
                <>
                  Doing it yourself saves roughly{" "}
                  <strong className="tabular-nums">{formatCurrency(difference)}</strong> in labour,
                  before your own time.
                </>
              ) : (
                <>
                  That quote is within{" "}
                  <strong className="tabular-nums">{formatCurrency(Math.abs(difference))}</strong> of
                  the material cost alone.
                </>
              )}
            </p>
          ) : null}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
        {result.effort.notes.map((note) => (
          <li key={note} className="flex gap-2">
            <span aria-hidden className="text-ink-subtle">
              •
            </span>
            {note}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-ink-subtle">
        ProjectKit does not estimate labour rates. Comparison uses only the quote you enter and the
        material cost above.
        {features.contractorLeads ? "" : " Contractor matching is not part of ProjectKit today."}
      </p>
    </section>
  );
}
