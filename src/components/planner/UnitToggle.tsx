"use client";

import type { UnitSystem } from "@/lib/units";

const OPTIONS: { value: UnitSystem; label: string; description: string }[] = [
  { value: "us", label: "US units", description: "Feet, inches, cubic yards" },
  { value: "metric", label: "Metric", description: "Meters, centimeters, cubic meters" },
];

export function UnitToggle({
  value,
  onChange,
}: {
  value: UnitSystem;
  onChange: (system: UnitSystem) => void;
}) {
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Measurement units</legend>
      <div className="inline-flex rounded-lg border border-line-strong bg-surface p-0.5">
        {OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              title={option.description}
              className={`rounded-[0.4375rem] px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand text-white"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
