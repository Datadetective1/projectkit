"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import { formatMaterialQuantity, formatRow, formatUnitPrice } from "@/lib/format";
import { formatCurrency, formatQuantity, type UnitSystem } from "@/lib/units";
import { ShopMaterials } from "@/components/monetization/ShopMaterials";
import type { CalculationResult } from "@/types/project";

interface ResultsPanelProps {
  result: CalculationResult;
  system: UnitSystem;
  projectName: string;
  /** Project slug, used as the categorical analytics label. */
  projectType: string;
}

export function ResultsPanel({ result, system, projectName, projectType }: ResultsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <Headline result={result} system={system} />
      <SummaryCard result={result} system={system} />
      <MaterialsCard
        result={result}
        system={system}
        projectName={projectName}
        projectType={projectType}
      />
      {result.scenarios.length > 0 ? <ScenariosCard result={result} system={system} /> : null}
      <ExplanationCard result={result} />
      <HowCalculatedCard result={result} />
    </div>
  );
}

function Headline({ result, system }: { result: CalculationResult; system: UnitSystem }) {
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
      className="rounded-[var(--radius-card)] border border-brand/20 bg-brand-soft p-5 sm:p-7"
    >
      <h2 id="result-headline" className="text-sm font-semibold uppercase tracking-wide text-brand-ink/70">
        {headline.label}
      </h2>
      <p
        className="mt-2 text-[2.125rem] font-semibold leading-tight tracking-tight text-brand-ink sm:text-5xl"
        // Announce the primary number when inputs change.
        aria-live="polite"
      >
        {formatted}
      </p>
      {headline.sublabel ? (
        <p className="mt-2 text-sm text-brand-ink/80 sm:text-base">{headline.sublabel}</p>
      ) : null}
    </section>
  );
}

function SummaryCard({ result, system }: { result: CalculationResult; system: UnitSystem }) {
  return (
    <section aria-labelledby="result-summary" className="pk-card p-5 sm:p-6">
      <h2 id="result-summary" className="text-lg font-semibold text-ink">
        Project summary
      </h2>
      <dl className="mt-4 divide-y divide-line">
        {result.summary.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
          >
            <dt className={`text-sm ${row.emphasis ? "font-semibold text-ink" : "text-ink-muted"}`}>
              {row.label}
              {row.note ? (
                <span className="block text-xs font-normal text-ink-subtle">{row.note}</span>
              ) : null}
            </dt>
            <dd
              className={`text-right tabular-nums ${
                row.emphasis ? "text-base font-semibold text-brand-ink" : "text-sm font-medium text-ink"
              }`}
            >
              {formatRow(row, system)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function MaterialsCard({
  result,
  system,
  projectName,
  projectType,
}: {
  result: CalculationResult;
  system: UnitSystem;
  projectName: string;
  projectType: string;
}) {
  const hasCosts = result.materials.some((line) => line.cost !== undefined);

  return (
    <section aria-labelledby="result-materials" className="pk-card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 p-5 pb-3 sm:p-6 sm:pb-3">
        <h2 id="result-materials" className="text-lg font-semibold text-ink">
          Materials
        </h2>
        {hasCosts ? (
          <p className="text-sm text-ink-muted">
            Estimated material cost{" "}
            <span className="font-semibold tabular-nums text-ink">
              {formatCurrency(result.costTotal)}
            </span>
          </p>
        ) : null}
      </div>

      {/* Phones get a card per material; a four-column table is unreadable there. */}
      <ul className="pk-print-cards divide-y divide-line border-y border-line sm:hidden">
        {result.materials.map((line) => (
          <li key={line.id} className="px-5 py-4">
            <p className="text-sm font-medium text-ink">
              {line.name}
              {line.isEstimate ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-accent">
                  Estimate
                </span>
              ) : null}
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-base font-semibold tabular-nums text-ink">
                {formatMaterialQuantity(line, system)}
              </span>
              {line.cost === undefined ? null : (
                <span className="text-sm tabular-nums text-ink-muted">
                  {formatCurrency(line.cost)}
                  {line.unitPrice === undefined ? null : (
                    <span className="text-ink-subtle"> · {formatUnitPrice(line, system)}</span>
                  )}
                </span>
              )}
            </div>
            {line.note ? (
              <p className="mt-1 text-xs text-ink-subtle">{line.note}</p>
            ) : null}
          </li>
        ))}
        {hasCosts ? (
          <li className="flex items-baseline justify-between gap-4 bg-surface-sunken px-5 py-3">
            <span className="text-sm font-semibold text-ink">Estimated material total</span>
            <span className="tabular-nums font-semibold text-ink">
              {formatCurrency(result.costTotal)}
            </span>
          </li>
        ) : null}
      </ul>

      <div className="hidden overflow-x-auto sm:block print:block">
        <table className="pk-print-table w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-y border-line bg-surface-sunken text-left">
              <th scope="col" className="px-5 py-2.5 font-medium text-ink-muted sm:px-6">
                Item
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium text-ink-muted">
                Quantity
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium text-ink-muted">
                Unit price
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium text-ink-muted sm:px-6">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {result.materials.map((line) => (
              <tr key={line.id}>
                <th scope="row" className="px-5 py-3 text-left font-medium text-ink sm:px-6">
                  {line.name}
                  {line.isEstimate ? (
                    <span className="ml-2 inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-accent">
                      Estimate
                    </span>
                  ) : null}
                  {line.note ? (
                    <span className="mt-0.5 block text-xs font-normal text-ink-subtle">
                      {line.note}
                    </span>
                  ) : null}
                </th>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink">
                  {formatMaterialQuantity(line, system)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink-muted">
                  {formatUnitPrice(line, system)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-medium text-ink sm:px-6">
                  {line.cost === undefined ? "—" : formatCurrency(line.cost)}
                </td>
              </tr>
            ))}
          </tbody>
          {hasCosts ? (
            <tfoot>
              <tr className="border-t border-line-strong bg-surface-sunken">
                <th scope="row" colSpan={3} className="px-5 py-3 text-left font-semibold text-ink sm:px-6">
                  Estimated material total
                </th>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-semibold text-ink sm:px-6">
                  {formatCurrency(result.costTotal)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="border-t border-line p-5 sm:p-6">
        <p className="text-xs text-ink-subtle">
          Costs use the prices in the estimate options above. Items marked{" "}
          <span className="font-semibold">Estimate</span> are planning allowances rather than exact
          quantities. Sales tax, delivery, and equipment rental are not included — on bulk materials
          delivery alone can add a meaningful amount.
        </p>
        <ShopMaterials
          className="mt-4"
          query={`${projectName} materials`}
          projectType={projectType}
          placement="materials"
          label="Shop materials"
        />
      </div>
    </section>
  );
}

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
                  Suggested
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

function ExplanationCard({ result }: { result: CalculationResult }) {
  return (
    <section aria-labelledby="result-meaning" className="pk-card p-5 sm:p-6">
      <h2 id="result-meaning" className="text-lg font-semibold text-ink">
        What this means
      </h2>
      <div className="pk-prose mt-3 space-y-3 text-sm sm:text-[0.9375rem]">
        {result.explanation.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {result.warnings.length > 0 ? (
        <ul className="mt-5 space-y-2.5">
          {result.warnings.map((warning, index) => (
            <li key={index} className="flex gap-2.5 rounded-lg bg-accent-soft p-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function HowCalculatedCard({ result }: { result: CalculationResult }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="pk-card overflow-hidden">
      <h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="how-calculated"
          className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6"
        >
          <span className="flex items-center gap-2.5 text-lg font-semibold text-ink">
            <Info className="h-5 w-5 text-brand" aria-hidden />
            How this was calculated
          </span>
          <ChevronDown
            aria-hidden
            className={`h-5 w-5 shrink-0 text-ink-subtle transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>

      {open ? (
        <div id="how-calculated" className="border-t border-line p-5 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">Formulas</h3>
          <dl className="mt-3 space-y-2.5">
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

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Planning assumptions
          </h3>
          <dl className="mt-3 divide-y divide-line">
            {result.assumptions.map((assumption) => (
              <div key={assumption.label} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="text-ink-muted">{assumption.label}</dt>
                <dd className="text-right font-medium text-ink">{assumption.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-xs text-ink-subtle">
            Prices are your own entries or ProjectKit planning defaults, not live retail prices.
          </p>
        </div>
      ) : null}
    </section>
  );
}
