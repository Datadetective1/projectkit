"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Printer } from "lucide-react";
import { WhereToBuy } from "@/components/monetization/WhereToBuy";
import { formatMaterialQuantity } from "@/lib/format";
import type { UnitSystem } from "@/lib/units";
import type { CalculationResult } from "@/types/project";
import { sourceFromPath, track } from "@/lib/analytics";

export interface ShoppingEntry {
  id: string;
  label: string;
  detail?: string;
  optional?: boolean;
  /**
   * What to search a retailer for, when this line came from a computed
   * material. Carried from `MaterialLine.searchTerm`.
   *
   * This was previously dropped here — the calculations set it, and the
   * shopping list threw it away, so a per-material destination was impossible
   * without touching every calculation file. Preserving one field is the whole
   * difference between "retailer links later" being a config change and being
   * a refactor.
   */
  searchTerm?: string;
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
    searchTerm: line.searchTerm,
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
  projectType,
}: {
  title: string;
  entries: ShoppingEntry[];
  checked: string[];
  onToggle: (id: string, next: boolean) => void;
  projectType?: string;
}) {
  const checkedSet = new Set(checked);
  const pathname = usePathname();
  const section = useRef<HTMLElement>(null);
  const seen = useRef(false);

  /*
   * Fired when the list actually reaches the screen, not when it mounts.
   *
   * The shopping list renders with the results, well below the fold on every
   * viewport. Counting a mount would report that everyone who calculated
   * anything also viewed their list, which is precisely the question this
   * event exists to answer — so it waits for the list to be seen, and fires
   * once.
   */
  useEffect(() => {
    const node = section.current;
    if (!node || seen.current || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting && !seen.current) {
            seen.current = true;
            track("shopping_list_viewed", {
              projectType,
              placement: "shopping_list",
              source: sourceFromPath(pathname ?? "/"),
            });
            observer.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [projectType, pathname]);
  const done = entries.filter((entry) => checkedSet.has(entry.id)).length;

  return (
    <section ref={section} aria-labelledby="shopping-list" className="pk-card p-5 sm:p-6">
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
            track("project_shared", { method: "print_list", placement: "shopping_list" });
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
                  {/* Renders nothing until a retailer is actually configured. */}
                  {entry.searchTerm ? (
                    <WhereToBuy
                      query={entry.searchTerm}
                      projectType={projectType}
                      materialId={entry.id.replace(/^material:/, "")}
                    />
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
