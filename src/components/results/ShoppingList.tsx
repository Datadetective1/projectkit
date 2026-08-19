"use client";

import { Printer } from "lucide-react";
import { formatMaterialQuantity } from "@/lib/format";
import type { UnitSystem } from "@/lib/units";
import type { CalculationResult } from "@/types/project";
import { track } from "@/lib/analytics";

export interface ShoppingEntry {
  id: string;
  label: string;
  detail?: string;
  optional?: boolean;
}

/** Build the checklist from computed materials plus the project's extras. */
export function buildShoppingList(
  result: CalculationResult,
  system: UnitSystem,
): ShoppingEntry[] {
  const fromMaterials = result.materials.map((line) => ({
    id: `material:${line.id}`,
    label: line.name,
    detail: formatMaterialQuantity(line, system),
    optional: line.optional,
  }));
  const extras = result.shoppingExtras.map((item) => ({
    id: `extra:${item.id}`,
    label: item.label,
    detail: item.detail,
    optional: item.optional,
  }));
  return [...fromMaterials, ...extras];
}

export function ShoppingList({
  title,
  entries,
  checked,
  onToggle,
}: {
  title: string;
  entries: ShoppingEntry[];
  checked: string[];
  onToggle: (id: string, next: boolean) => void;
}) {
  const checkedSet = new Set(checked);
  const done = entries.filter((entry) => checkedSet.has(entry.id)).length;

  return (
    <section aria-labelledby="shopping-list" className="pk-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="shopping-list" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted" aria-live="polite">
            {done} of {entries.length} ticked off
          </p>
        </div>
        <button
          type="button"
          className="pk-btn pk-btn-secondary pk-no-print"
          onClick={() => {
            track("project_shared", { method: "print_list" });
            window.print();
          }}
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print
        </button>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {entries.map((entry) => {
          const isChecked = checkedSet.has(entry.id);
          return (
            <li key={entry.id}>
              <label className="flex cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => onToggle(entry.id, event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-line-strong accent-[var(--color-brand)]"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-medium ${
                      isChecked ? "text-ink-subtle line-through" : "text-ink"
                    }`}
                  >
                    {entry.label}
                    {entry.optional ? (
                      <span className="ml-2 text-xs font-normal text-ink-subtle">(optional)</span>
                    ) : null}
                  </span>
                  {entry.detail ? (
                    <span className="mt-0.5 block text-sm tabular-nums text-ink-muted">
                      {entry.detail}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
