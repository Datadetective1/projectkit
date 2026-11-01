"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Printer, Truck } from "lucide-react";
import { WhereToBuy } from "@/components/monetization/WhereToBuy";
import { RetailerDisclosure } from "@/components/monetization/RetailerDisclosure";
import { formatMaterialQuantity, formatUnitPrice } from "@/lib/format";
import {
  countReadyToBuy,
  groupShoppingEntries,
  hasRetailerLink,
  isSupply,
} from "@/lib/shopping/groups";
import { formatCurrency, type Measure, type UnitSystem } from "@/lib/units";
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
  /** Planning cost for this line, when the price book has one. */
  cost?: number;
  /** Pre-formatted unit price, e.g. "$42 per gal". Absent when unpriced. */
  unitPrice?: string;
  /** A planning allowance rather than a computed quantity. */
  isEstimate?: boolean;
  /** The material's own caveat, carried from the calculation. */
  note?: string;
}

/**
 * Build the checklist from computed materials plus the project's extras.
 *
 * Carries the price fields now. They used to be read only by a separate
 * "Materials" table that listed the same materials with the same quantities
 * one section higher up the page; the two have been merged, so the cost travels
 * with the thing it costs.
 */
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
    cost: line.cost,
    unitPrice: line.unitPrice === undefined ? undefined : formatUnitPrice(line, system),
    isEstimate: line.isEstimate,
    note: line.note,
  }));
  const extras = result.shoppingExtras.map((item) => ({
    id: `extra:${item.id}`,
    label: item.label,
    detail: item.detail,
    optional: item.optional,
    searchTerm: item.searchTerm,
  }));
  return [...fromMaterials, ...extras];
}

/**
 * Everything the project needs, in one place, grouped by how it reaches you.
 *
 * **This absorbed the Materials table.** The page used to carry both: a
 * "Materials" card with every line's quantity, unit price and cost, and then a
 * "shopping list" a section later with every line's quantity again plus a
 * checkbox and a buy button. Users told us the pages felt long, and the reason
 * was not scrolling — it was reading the same materials twice and having to
 * work out whether the second list was saying anything new. It was not.
 *
 * So each material now states itself once and completely: what it is, how much,
 * what it should cost, and where to get it. The grouping carries the part that
 * genuinely differs between lines — a parcel, a truckload from a local yard, or
 * a tool you probably own.
 *
 * Grouping never reorders within a group and never renames an id, because
 * `checked` is persisted against those ids in saved projects.
 */
export function ShoppingList({
  title,
  entries,
  checked,
  onToggle,
  projectType,
  costTotal,
}: {
  title: string;
  entries: ShoppingEntry[];
  checked: string[];
  onToggle: (id: string, next: boolean) => void;
  projectType?: string;
  /** Estimated materials total. Stated once, here, beside what it is buying. */
  costTotal?: number;
}) {
  const checkedSet = new Set(checked);
  const pathname = usePathname();
  const section = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const groups = groupShoppingEntries(entries);
  const readyToBuy = countReadyToBuy(entries);
  const priced = entries.some((entry) => entry.cost !== undefined);
  /*
   * The disclosure goes above whichever group holds the first link. Usually
   * that is "Ready to buy online"; for mulch, gravel and sod, whose materials
   * all come by the truck, it is the tools list.
   */
  const disclosedGroup = groups.find((group) => group.entries.some(hasRetailerLink))?.id;

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
          <p className="mt-1 text-sm text-ink-muted">
            <span aria-live="polite">
              {done} of {entries.length} ticked off
            </span>
            {priced && costTotal !== undefined ? (
              <>
                {" · "}
                <span className="tabular-nums">
                  {formatCurrency(costTotal)} estimated for materials
                </span>
              </>
            ) : null}
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
          <div key={group.id} data-group={group.id}>
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
              The Amazon disclosure sits directly above the first group with a
              paid link and nowhere else. The Operating Agreement wants it near the links
              rather than in a page footer, and repeating it on every row is
              what made a checklist read like an affiliate page.
            */}
            {group.id === disclosedGroup ? <RetailerDisclosure className="mt-2" /> : null}

            <ul className="mt-3 divide-y divide-line border-t border-line">
              {group.entries.map((entry) => {
                const isChecked = checkedSet.has(entry.id);
                return (
                  <li key={entry.id}>
                    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-3">
                      {/*
                        The label wraps the checkbox and the text only, never
                        the buy button. Activating a label activates its
                        control, so a button nested inside one can tick the box
                        instead of following its own link.
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
                            {entry.isEstimate ? (
                              <span className="ml-2 inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-accent">
                                Estimate
                              </span>
                            ) : null}
                          </span>

                          {/*
                            Quantity, unit price and cost on one line. They were
                            three columns of a separate table; as a sentence
                            under the name they take one row on a phone instead
                            of a horizontally scrolling grid.
                          */}
                          {entry.detail || entry.cost !== undefined ? (
                            <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums text-ink-muted">
                              {entry.detail ? <span>{entry.detail}</span> : null}
                              {entry.cost !== undefined ? (
                                <>
                                  <span aria-hidden className="text-ink-subtle">
                                    ·
                                  </span>
                                  <span className="font-medium text-ink">
                                    {formatCurrency(entry.cost)}
                                  </span>
                                </>
                              ) : null}
                              {entry.unitPrice ? (
                                <span className="text-ink-subtle">({entry.unitPrice})</span>
                              ) : null}
                            </span>
                          ) : null}

                          {entry.note ? (
                            <span className="mt-0.5 block text-xs text-ink-subtle">
                              {entry.note}
                            </span>
                          ) : null}
                        </span>
                      </label>

                      {entry.searchTerm ? (
                        <WhereToBuy
                          query={entry.searchTerm}
                          projectType={projectType}
                          measure={entry.measure}
                          entryId={entry.id}
                          compact={isSupply(entry)}
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

      {priced ? (
        <p className="mt-5 border-t border-line pt-4 text-xs text-ink-subtle">
          Costs use the prices in the estimate options above. Sales tax, delivery, and equipment
          rental are not included — on bulk materials delivery alone can add a meaningful amount.
        </p>
      ) : null}
    </section>
  );
}
