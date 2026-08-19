"use client";

import { useId } from "react";
import { rateLabel, unitLabel, type UnitSystem } from "@/lib/units";
import { describeFor } from "@/lib/calc/describe";
import type { InputValue, InputValues, ProjectInput } from "@/types/project";

interface InputFieldProps {
  input: ProjectInput;
  values: InputValues;
  system: UnitSystem;
  error?: string;
  onChange: (id: string, value: InputValue) => void;
}

export function InputField({ input, values, system, error, onChange }: InputFieldProps) {
  const reactId = useId();
  // Help text that quotes a measurement is a function of the unit system, so a
  // field showing centimetres never explains itself in inches.
  const help = typeof input.help === "function" ? input.help(describeFor(system)) : input.help;
  const fieldId = `${input.id}-${reactId}`;
  const helpId = help ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const value = values[input.id];

  if (input.type === "toggle") {
    const checked = value === true;
    return (
      <div className="flex items-start gap-3">
        <input
          id={fieldId}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(input.id, event.target.checked)}
          aria-describedby={describedBy}
          className="mt-1 h-5 w-5 shrink-0 rounded border-line-strong text-brand accent-[var(--color-brand)]"
        />
        <div className="min-w-0">
          <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
            {input.label}
          </label>
          {help ? (
            <p id={helpId} className="mt-0.5 text-xs text-ink-muted">
              {help}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (input.type === "select") {
    return (
      <div>
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
          {input.label}
        </label>
        <select
          id={fieldId}
          className="pk-field mt-1.5"
          value={typeof value === "string" ? value : input.defaultValue}
          aria-describedby={describedBy}
          onChange={(event) => onChange(input.id, event.target.value)}
        >
          {input.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {help ? (
          <p id={helpId} className="mt-1.5 text-xs text-ink-muted">
            {help}
          </p>
        ) : null}
      </div>
    );
  }

  /*
   * A rate names both its units, so it builds its own suffix — a hardcoded
   * override would say "$ / yd³" beside a value the engine has converted to
   * per-cubic-metre. Everything else falls back to the override, then to the
   * measure's own label.
   */
  const suffix = input.perMeasure
    ? rateLabel(input.measure, input.perMeasure, system)
    : (input.unitOverride ?? unitLabel(input.measure, system));

  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
        {input.label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={fieldId}
          // Text + inputMode keeps partial entries like "12." intact while typing,
          // which type="number" discards in some browsers.
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={`pk-field ${suffix ? "pr-16" : ""}`}
          value={value === undefined || value === null ? "" : String(value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const next = event.target.value;
            // Allow digits, one decimal point, and an empty field.
            if (next === "" || /^\d*\.?\d*$/.test(next)) {
              onChange(input.id, next === "" ? "" : next);
            }
          }}
        />
        {suffix ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-subtle"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {help && !error ? (
        <p id={helpId} className="mt-1.5 text-xs text-ink-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
