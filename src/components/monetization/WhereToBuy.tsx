"use client";

import { ExternalLink } from "lucide-react";
import { retailerRel, retailerUrl, retailers, whereToBuyEnabled } from "@/config/retailers";
import { track } from "@/lib/analytics";
import type { Measure } from "@/lib/units";

/**
 * "Where to buy", per material.
 *
 * Off by default and off in production today — `whereToBuyEnabled` requires
 * both a feature flag and at least one configured destination, and no
 * destination is configured. This renders nothing until a real retailer
 * relationship exists.
 *
 * The restraint is the design. A shopping list with a row of retailer buttons
 * against every line stops being a checklist and becomes an affiliate page, and
 * the moment a planning tool looks like one, its numbers stop being believed.
 * So this is small, text-weight, and sits under the item rather than beside it —
 * available to someone who wants it, invisible to someone ticking items off in
 * a store.
 *
 * The search term comes from the calculation (`MaterialLine.searchTerm`), never
 * from anything the user typed, and is never sent to analytics.
 */
/**
 * Units that mean "a truck brings this from a yard".
 *
 * Cubic yards and tons are how bulk aggregate, ready-mix and mulch are sold,
 * and no online retailer sells them — an Amazon search for "ready mix concrete
 * delivery" returns nothing anyone wants. Offering the link anyway would be a
 * dead end dressed up as help, and dead ends are what make an affiliate surface
 * feel like one.
 */
const BULK_MEASURES: ReadonlySet<Measure> = new Set<Measure>(["volumeYd", "weight"]);

export function WhereToBuy({
  query,
  projectType,
  measure,
  className = "",
}: {
  /** The material's search term. Not user input. */
  query: string;
  projectType?: string;
  /** Suppresses the link for goods sold by the yard or the ton. */
  measure?: Measure;
  className?: string;
}) {
  if (!whereToBuyEnabled || !query) return null;
  if (measure && BULK_MEASURES.has(measure)) return null;

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
          onClick={() => track("retailer_click", { projectType, placement: "shopping_list" })}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-4 hover:underline"
        >
          {retailer.name}
          <ExternalLink className="h-3 w-3" aria-hidden />
          <span className="sr-only">
            — search for {query} at {retailer.name} (opens in a new tab)
          </span>
        </a>
      ))}

    </div>
  );
}
