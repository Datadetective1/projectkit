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
 *
 * **It used to open with three tiles restating the material total, the
 * difficulty and the rough time.** All three already sit in the action card
 * directly under the result, so the section spent its first screen telling
 * people what they had just read, and the one thing it uniquely offers — the
 * comparison against a real quote — was below that. It leads with the question
 * now, and stays quiet until there is a quote to answer it with.
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="diy-or-hire" className="text-lg font-semibold text-ink">
          DIY or hire someone?
        </h2>
        {/*
          The difficulty as a chip beside the heading rather than as a tile of
          its own. It is context for the question, not a finding.
        */}
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            DIFFICULTY_STYLES[result.effort.difficulty] ?? "bg-surface-sunken text-ink"
          }`}
        >
          {result.effort.difficulty}
        </span>
      </div>

      <div className="mt-4">
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
          Have a contractor quote? Enter it to compare against your{" "}
          {formatCurrency(result.costTotal)} of materials.
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
                  <strong className="tabular-nums">{formatCurrency(difference)}</strong> in labor,
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
        {/* What actually makes this job easy or hard — new information. */}
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
        Cubitora does not estimate labor rates. The comparison uses only the quote you enter and
        the material cost.
        {features.contractorLeads ? "" : " Contractor matching is not part of Cubitora today."}
      </p>
    </section>
  );
}
