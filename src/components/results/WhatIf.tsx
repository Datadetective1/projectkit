"use client";

import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import { formatCurrency, roundTo, unitLabel, type UnitSystem } from "@/lib/units";
import type { InputValue, InputValues, NumberInput, ProjectDefinition } from "@/types/project";

/**
 * "What if…" — the assumptions worth poking at, right beside the result.
 *
 * The full set of options lives in the form; this surfaces the two or three
 * that most change the answer so a user can test them without scrolling back.
 * The controls write to the same state, so the estimate updates as they move.
 */

/** Waste first, then the prices that drive the budget. Capped at three. */
export function whatIfInputs(def: ProjectDefinition, values: InputValues): NumberInput[] {
  const visible = def.inputs.filter(
    (input): input is NumberInput =>
      input.type === "number" && (!input.showWhen || input.showWhen(values)),
  );

  const waste = visible.filter((input) => input.measure === "percent");
  const prices = visible.filter((input) => input.measure === "currency");

  return [...waste, ...prices].slice(0, 3);
}

/** A sensible nudge for each control: 1% of waste, a dollar or two of price. */
function stepFor(input: NumberInput): number {
  if (input.measure === "percent") return 1;
  if (input.step && input.step > 0) return input.step;
  return 1;
}

export function WhatIf({
  def,
  values,
  system,
  costTotal,
  onChange,
}: {
  def: ProjectDefinition;
  values: InputValues;
  system: UnitSystem;
  costTotal: number;
  onChange: (id: string, value: InputValue) => void;
}) {
  const controls = whatIfInputs(def, values);
  if (controls.length === 0) return null;

  return (
    <section aria-labelledby="what-if" className="pk-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="what-if" className="flex items-center gap-2 text-lg font-semibold text-ink">
          <SlidersHorizontal className="h-5 w-5 text-brand" aria-hidden />
          What if…
        </h2>
        <p className="text-sm text-ink-muted">
          Estimated cost{" "}
          <span className="font-semibold tabular-nums text-ink">{formatCurrency(costTotal)}</span>
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Nudge the assumptions that move the number most. Everything updates as you go.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {controls.map((input) => (
          <WhatIfControl
            key={input.id}
            input={input}
            value={values[input.id]}
            system={system}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}

function WhatIfControl({
  input,
  value,
  system,
  onChange,
}: {
  input: NumberInput;
  value: InputValue | undefined;
  system: UnitSystem;
  onChange: (id: string, value: InputValue) => void;
}) {
  const numeric = typeof value === "number" ? value : Number(value);
  const current = Number.isFinite(numeric) ? numeric : input.defaultValue;
  const step = stepFor(input);
  const suffix = input.unitOverride ?? unitLabel(input.measure, system);

  const nudge = (direction: 1 | -1) => {
    const next = roundTo(Math.max(current + direction * step, 0), 4);
    if (input.max !== undefined && next > input.max) return;
    onChange(input.id, next);
  };

  const label = `${input.label}${suffix && suffix !== "%" ? ` (${suffix})` : ""}`;

  return (
    <div className="rounded-xl border border-line bg-surface-sunken/40 p-3">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={current <= (input.min ?? 0)}
          aria-label={`Decrease ${input.label}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line-strong bg-surface text-ink transition-colors hover:bg-surface-sunken disabled:opacity-40"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>

        <output className="text-base font-semibold tabular-nums text-ink">
          {input.measure === "currency"
            ? formatCurrency(current)
            : `${roundTo(current, 2)}${suffix === "%" ? "%" : ""}`}
        </output>

        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={input.max !== undefined && current >= input.max}
          aria-label={`Increase ${input.label}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line-strong bg-surface text-ink transition-colors hover:bg-surface-sunken disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
