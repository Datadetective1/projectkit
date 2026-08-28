"use client";

import { ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import { retailerRel, retailerUrl, retailers, whereToBuyEnabled } from "@/config/retailers";
import { sourceFromPath, track } from "@/lib/analytics";
import type { Measure } from "@/lib/units";

/**
 * "Where to buy", per material.
 *
 * Live, since Amazon Associates was approved. `whereToBuyEnabled` is now a
 * kill switch rather than an on switch: setting
 * `NEXT_PUBLIC_WHERE_TO_BUY_ENABLED=false` removes every outbound link without
 * a deploy. Retailers with no agreement stay absent because they have no
 * configuration, not because of a flag.
 *
 * The restraint is the design. A shopping list with a row of retailer buttons
 * against every line stops being a checklist and becomes an affiliate page, and
 * the moment a planning tool looks like one, its numbers stop being believed.
 * So this is small, text-weight, and sits under the item rather than beside it —
 * available to someone who wants it, invisible to someone ticking items off in
 * a store.
 *
 * The search term comes from the calculation (`MaterialLine.searchTerm`), never
 * from anything the user typed, and is never sent to analytics — the event
 * carries `materialId` instead, which identifies the same thing with bounded
 * cardinality.
 */
/**
 * What a general online retailer is not a realistic source for.
 *
 * Every link that leads somewhere useless costs more than it earns: it wastes
 * a click, and it makes the whole surface read as an affiliate page rather than
 * a shopping list. So the default is to link nothing unless it is plausible.
 *
 *  - **volumeYd, weight** — bulk aggregate, ready-mix, mulch by the cubic yard
 *    or the ton. These arrive on a truck from a yard. An Amazon search for
 *    "ready mix concrete delivery" returns nothing anyone wants.
 *  - **length** — dimensional lumber sold by the linear foot: decking, joists,
 *    rim boards, form boards. Nobody ships 449 linear feet of decking. This
 *    also drops a couple of things Amazon does stock, like quarter round, and
 *    that trade is deliberate — a rule that is occasionally too strict beats a
 *    rule that occasionally sends someone to a dead end.
 *
 * `count`, `area` and `volumeLiquid` stay: fasteners, tape, grout, spacers,
 * paint, boxed flooring and tile are exactly what a general retailer sells.
 */
const UNSUITABLE_MEASURES: ReadonlySet<Measure> = new Set<Measure>([
  "volumeYd",
  "weight",
  "length",
]);

/**
 * Materials no measure can rule out.
 *
 * Sod is quoted in square feet like anything else, but it is a perishable crop
 * delivered on pallets within a day of being cut. There is no version of that
 * which arrives in a parcel.
 */
const UNSUITABLE_MATERIALS: ReadonlySet<string> = new Set(["sod-area"]);

export function WhereToBuy({
  query,
  projectType,
  measure,
  materialId,
  className = "",
}: {
  /** The material's search term. Not user input. */
  query: string;
  projectType?: string;
  /** Suppresses the link for goods a parcel carrier cannot sensibly deliver. */
  measure?: Measure;
  /**
   * The calculation's own id.
   *
   * Two jobs: the handful of exclusions `measure` misses, and the analytics
   * `materialId`, which is what makes "which material earns the clicks?"
   * answerable. Code-authored in `lib/calculations/*.ts`, never user input.
   */
  materialId?: string;
  className?: string;
}) {
  /*
   * Hook before the early returns — the rules of hooks are not negotiable, and
   * every `return null` below sits after it for that reason.
   */
  const pathname = usePathname();

  if (!whereToBuyEnabled || !query) return null;
  if (measure && UNSUITABLE_MEASURES.has(measure)) return null;
  if (materialId && UNSUITABLE_MATERIALS.has(materialId)) return null;

  return (
    <div className={`pk-no-print mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-subtle">
        Where to buy
      </span>
      {retailers.map((retailer) => (
        <a
          key={retailer.id}
          href={retailerUrl(retailer, query)}
          target="_blank"
          rel={retailerRel(retailer)}
          onClick={() =>
            /*
             * The one thing that must never appear here is `query`. It is the
             * material's search term — code-authored, and safe in that sense —
             * but sending it would make the event's cardinality a function of
             * the calculations rather than of a fixed vocabulary, and it is
             * exactly the field a future edit would be tempted to make dynamic.
             * `materialId` says the same thing in a bounded way.
             */
            track("retailer_click", {
              retailer: retailer.id,
              projectType,
              materialId,
              placement: "shopping_list",
              source: sourceFromPath(pathname ?? "/"),
            })
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-4 hover:underline"
        >
          {/*
            "(paid link)" comes from the affiliate flag, not from the name, so
            the marker cannot drift from the fact. A retailer we have no
            agreement with never carries it, and one that gets approved later
            picks it up without anybody remembering to edit a label.

            Per-link as well as the disclosure above the list: the FTC asks for
            it clear and conspicuous at the link itself, and someone scanning a
            checklist may never read the paragraph at the top.
          */}
          {retailer.name}
          {retailer.affiliate ? " (paid link)" : null}
          <ExternalLink className="h-3 w-3" aria-hidden />
          <span className="sr-only">
            — search for {query} at {retailer.name}
            {retailer.affiliate ? ", a paid affiliate link" : ""} (opens in a new tab)
          </span>
        </a>
      ))}

    </div>
  );
}
