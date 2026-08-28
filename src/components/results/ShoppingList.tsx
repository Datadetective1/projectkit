"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Printer, Truck } from "lucide-react";
import { WhereToBuy } from "@/components/monetization/WhereToBuy";
import { RetailerDisclosure } from "@/components/monetization/RetailerDisclosure";
import { formatMaterialQuantity } from "@/lib/format";
import { countReadyToBuy, groupShoppingEntries, materialIdOf } from "@/lib/shopping/groups";
import type { Measure, UnitSystem } from "@/lib/units";
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
  /**
   * The material's unit of measure, when it came from a computed line.
   *
   * Used only to decide whether this arrives in a parcel or on a truck: goods
   * sold by the cubic yard or the ton come from a local yard, and no online
   * retailer sells them.
   */
  measure?: Measure;
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
    measure: line.measure,
  }));
  const extras = result.shoppingExtras.map((item) => ({
    id: `extra:${item.id}`,
    label: item.label,
    detail: item.detail,
    optional: item.optional,
  }));
  return [...fromMaterials, ...extras];
}

/**
 * The shopping list, grouped by how each thing actually reaches your driveway.
 *
 * It used to be one flat checklist of twelve or more lines, with a small text
 * link under about half of them. Grouping is the difference between "here is
 * everything, good luck" and an answer: the things you can order now, the
 * things that come by the load from a supplier you have to call, and the tools
 * to have ready before you start. Someone looking at a cubic yard of gravel
 * with no buy button needs to know that is the correct answer rather than a gap
 * in the product.
 *
 * Grouping never reorders within a group and never renames an id, because
 * `checked` is persisted against those ids in saved projects — a regrouping
 * that renumbered them would silently wipe every tick a returning user had.
 */
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

  const groups = groupShoppingEntries(entries);
  const readyToBuy = countReadyToBuy(entries);

  /*
   * Fired when the list actually reaches the screen, not when it mounts.
   *
   * The list renders with the results, and on a phone it is still below the
   * fold even after being moved up the page. Counting a mount would report that
   * everyone who calculated anything also viewed their list, which is precisely
   * the question this event exists to answer — so it waits for the list to be
   * seen, and fires once.
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
              itemsReady: readyToBuy,
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
  }, [projectType, pathname, readyToBuy]);

  const done = entries.filter((entry) => checkedSet.has(entry.id)).length;

  return (
    <section
      ref={section}
      id="shopping-list"
      aria-labelledby="shopping-list-heading"
      className="pk-card scroll-mt-24 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="shopping-list-heading" className="text-lg font-semibold text-ink">
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

      <div className="mt-5 flex flex-col gap-7">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                {group.id === "local" ? (
                  <Truck className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                ) : null}
                {group.title}
              </h3>
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">
                {group.entries.length} {group.entries.length === 1 ? "item" : "items"}
              </span>
            </div>

            {group.note ? (
              <p className="mt-1.5 max-w-prose text-sm text-ink-muted">{group.note}</p>
            ) : null}

            {/*
              The Amazon disclosure sits directly above the first paid link and
              nowhere else. The Operating Agreement wants it displayed near the
              links rather than in a page footer, and it does not want it beside
              every single one — repeating it on each of twelve rows is what
              turned a checklist into something that read like an affiliate
              page, which is the exact impression a planning tool cannot afford.
            */}
            {group.id === "online" ? <RetailerDisclosure className="mt-2" /> : null}

            <ul className="mt-3 divide-y divide-line border-t border-line">
              {group.entries.map((entry) => {
                const isChecked = checkedSet.has(entry.id);
                return (
                  <li key={entry.id}>
                    {/*
                      Stacked on a phone, side by side from `sm` up.

                      `flex-wrap` was not enough: the label carries `min-w-0
                      flex-1`, so it shrank to nothing rather than pushing the
                      button onto its own line, and "Drywall sheets (4 x 8 ft)"
                      rendered one word per line beside an untouched button.
                      Wrapping is the wrong tool when one child is allowed to
                      collapse; a direction change is the right one.
                    */}
                    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-3">
                      {/*
                        The label wraps the checkbox and the text only, never
                        the buy button. Activating a label activates its
                        control, so a button nested inside one can tick the box
                        instead of following its own link — or do both.
                      */}
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
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
                              <span className="ml-2 text-xs font-normal text-ink-subtle">
                                (optional)
                              </span>
                            ) : null}
                          </span>
                          {entry.detail ? (
                            <span className="mt-0.5 block text-sm tabular-nums text-ink-muted">
                              {entry.detail}
                            </span>
                          ) : null}
                        </span>
                      </label>

                      {entry.searchTerm ? (
                        <WhereToBuy
                          query={entry.searchTerm}
                          projectType={projectType}
                          measure={entry.measure}
                          materialId={materialIdOf(entry.id)}
                          // Indented to the text column on mobile, where it
                          // sits under the label rather than beside it.
                          className="ml-8 mt-0 shrink-0 sm:ml-0"
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
