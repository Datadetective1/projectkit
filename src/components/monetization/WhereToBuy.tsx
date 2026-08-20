"use client";

import { ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import { retailerRel, retailerUrl, retailers, whereToBuyEnabled } from "@/config/retailers";
import { sourceFromPath, track } from "@/lib/analytics";

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
export function WhereToBuy({
  query,
  projectType,
  materialId,
  className = "",
}: {
  /** The material's search term. Not user input. */
  query: string;
  projectType?: string;
  /** The calculation's own id for this material. Not user input. */
  materialId?: string;
  className?: string;
}) {
  const pathname = usePathname();

  if (!whereToBuyEnabled || !query) return null;

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
            track("retailer_click", {
              projectType,
              materialId,
              retailer: retailer.id,
              placement: "shopping_list",
              source: sourceFromPath(pathname ?? "/"),
            })
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-4 hover:underline"
        >
          {retailer.name}
          <ExternalLink className="h-3 w-3" aria-hidden />
          <span className="sr-only">
            — search for {query} at {retailer.name} (opens in a new tab)
          </span>
        </a>
      ))}
      {/*
        Disclosure at the link, not in a footer. Someone deciding whether to
        click should be able to see the relationship without scrolling.
      */}
      {retailers.some((retailer) => retailer.affiliate) ? (
        <span className="basis-full text-[0.6875rem] text-ink-subtle">
          Cubitora may earn a commission from purchases made through these links. It does not
          change the quantities above.
        </span>
      ) : null}
    </div>
  );
}
