"use client";

import { ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import { retailerRel, retailerUrl, retailers, whereToBuyEnabled } from "@/config/retailers";
import { sourceFromPath, track } from "@/lib/analytics";
import { analyticsIdOf, hasRetailerLink } from "@/lib/shopping/groups";
import type { Measure } from "@/lib/units";

/**
 * The buy action for one material.
 *
 * Live since Amazon Associates was approved. `whereToBuyEnabled` is a kill
 * switch rather than an on switch: setting
 * `NEXT_PUBLIC_WHERE_TO_BUY_ENABLED=false` removes every outbound link without
 * a deploy. Retailers with no agreement stay absent because they have no
 * configuration, not because of a flag.
 *
 * **This used to be 11px of text reading "Where to buy · Amazon".** That
 * restraint was right when there was no programme and the panel was a
 * placeholder — a shopping list with a row of retailer buttons against every
 * line stops being a checklist and becomes an affiliate page. But real users
 * then told us they never realised Cubitora could help them buy anything, and
 * a link nobody sees is not restraint; it is a feature that does not exist.
 *
 * So it is a button now, and it says what it does. What keeps it from reading
 * as an affiliate page is everything around it: it renders on roughly half the
 * lines, under a heading that already said these are the buyable ones, below a
 * result that never changes because of it. The label is the material's own
 * action — "Shop on Amazon" — not a retailer's branding.
 *
 * The search term comes from the calculation (`MaterialLine.searchTerm`, or
 * `ShoppingItem.searchTerm` for a tool), never
 * from anything the user typed, and is never sent to analytics — the event
 * carries `materialId` instead, which identifies the same thing with bounded
 * cardinality.
 *
 * Whether a line gets a link at all is decided by `lib/shopping/groups`, shared
 * with the list that groups them and the card that counts them, so the three
 * cannot disagree.
 */
export function WhereToBuy({
  query,
  projectType,
  measure,
  entryId,
  compact = false,
  className = "",
}: {
  /** The line's search term. Not user input. */
  query: string;
  projectType?: string;
  /** Suppresses the link for goods a parcel carrier cannot sensibly deliver. */
  measure?: Measure;
  /**
   * The shopping-list id, `material:<id>` or `extra:<id>`.
   *
   * Two jobs: the exclusions `measure` misses, and the analytics `materialId`,
   * which is what makes "which line earns the clicks?" answerable. The ids
   * are code-authored in `lib/calculations/*.ts`, never user input.
   */
  entryId: string;
  /**
   * A quieter text link for the tools list, where a row of full buttons
   * under every hand tool would turn a checklist into a catalogue.
   */
  compact?: boolean;
  className?: string;
}) {
  /*
   * Hook before the early returns — the rules of hooks are not negotiable, and
   * every `return null` below sits after it for that reason.
   */
  const pathname = usePathname();

  if (!whereToBuyEnabled || !query) return null;
  /*
   * The same predicate the list uses, called with the same fields. Asking the
   * shared rule rather than re-implementing it is what stops this link
   * appearing on a line the list has filed under "order locally".
   */
  if (!hasRetailerLink({ id: entryId, searchTerm: query, measure })) return null;

  const materialId = analyticsIdOf(entryId);

  return (
    <div className={`pk-no-print mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
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
          className={
            compact
              ? "inline-flex items-center gap-1 text-sm font-medium text-brand underline-offset-2 hover:underline"
              : "pk-btn pk-btn-secondary h-9 px-3 text-sm"
          }
        >
          Shop on {retailer.name}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {/*
            The leading space is deliberate. JSX drops the whitespace at a line
            break inside an element, so without it the accessible name ran
            together as "Shop on Amazon— search for…" with no gap before the
            dash — which a screen reader reads as one word.
          */}
          {" "}
          <span className="sr-only">
            — search for {query} at {retailer.name}
            {retailer.affiliate ? ", a paid affiliate link" : ""} (opens in a new tab)
          </span>
        </a>
      ))}

      {/*
        "Paid link" comes from the affiliate flag, not from the name, so the
        marker cannot drift from the fact. A retailer we have no agreement with
        never carries it, and one approved later picks it up without anybody
        remembering to edit a label.

        Beside the button as well as in the disclosure above the list: the FTC
        asks for it clear and conspicuous at the link itself, and someone
        scanning a checklist may never read the paragraph at the top. Small and
        quiet on purpose — it has to be legible, not loud.
      */}
      {retailers.some((retailer) => retailer.affiliate) ? (
        <span className="text-xs text-ink-subtle">Paid link</span>
      ) : null}
    </div>
  );
}
