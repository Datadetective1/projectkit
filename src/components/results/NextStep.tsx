"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowDown, ShoppingCart, Truck } from "lucide-react";
import { countLocalOnly, countReadyToBuy } from "@/lib/shopping/groups";
import type { ShoppingEntry } from "@/components/results/ShoppingList";
import { formatCurrency } from "@/lib/units";
import { sourceFromPath, track } from "@/lib/analytics";

/**
 * What to do next, directly under the answer.
 *
 * This card exists because of one piece of user research: people liked the
 * calculators, understood the results, and did not know Cubitora could help
 * them buy anything. The shopping list was the tenth block on the results page,
 * and the only shopping affordance anyone could find sat at the third — a
 * "Shop materials" button that opened a Google search. Someone who went looking
 * found the decoy, left, and concluded the product did not do this.
 *
 * So the offer is made once, immediately, in the space where a person's eyes
 * already are after the headline number. Everything here is derived from the
 * calculation that just ran; nothing new is computed and no quantity is
 * restated that the summary below does not already show.
 *
 * **The primary action changes shape when there is nothing to buy.** Three of
 * the ten planners — mulch, gravel, sod — produce materials that arrive by the
 * load from a local yard and cannot be bought online at all. Sending those
 * users to an empty shopping sheet would be worse than the buried list this
 * replaces, so for them the same button promises what the list actually
 * delivers: the quantities to take to a supplier.
 */
export function NextStep({
  projectType,
  entries,
  costTotal,
  difficulty,
  timeCategory,
  onShop,
  onPlan,
}: {
  projectType: string;
  /** The built shopping list. Counted here, grouped identically below. */
  entries: ShoppingEntry[];
  costTotal: number;
  difficulty: string;
  timeCategory: string;
  /** Scrolls to the shopping list. Same page — nothing is navigated away. */
  onShop: () => void;
  /** Scrolls to the deeper project detail. */
  onPlan: () => void;
}) {
  const pathname = usePathname();
  const card = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const readyToBuy = countReadyToBuy(entries);
  const localOnly = countLocalOnly(entries);
  const canShopOnline = readyToBuy > 0;

  /*
   * How many people were even offered this.
   *
   * Fired on visibility rather than on mount, and it matters more here than
   * anywhere else in the funnel: without it, a low `shopping_cta_clicked` count
   * cannot distinguish "people do not want this" from "people never saw it" —
   * which is precisely the ambiguity that produced this redesign.
   */
  useEffect(() => {
    const node = card.current;
    if (!node || seen.current || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting && !seen.current) {
            seen.current = true;
            track("shopping_cta_viewed", {
              projectType,
              placement: "result_summary",
              itemsReady: readyToBuy,
              source: sourceFromPath(pathname ?? "/"),
            });
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [projectType, readyToBuy, pathname]);

  const handleShop = () => {
    track("shopping_cta_clicked", {
      projectType,
      placement: "result_summary",
      itemsReady: readyToBuy,
      source: sourceFromPath(pathname ?? "/"),
    });
    onShop();
  };

  return (
    <section
      ref={card}
      aria-labelledby="next-step-heading"
      className="pk-no-print pk-card p-5 sm:p-6"
    >
      <h2 id="next-step-heading" className="text-lg font-semibold text-ink">
        Here&rsquo;s what you need
      </h2>

      {/*
        Three facts, not a dashboard. Cost, how long the list is, and how much
        of it is a click away — which together answer "what will this cost me
        and how much work is getting hold of it".
      */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Stat label="Materials, estimated" value={formatCurrency(costTotal)} emphasis />
        <Stat label="On your list" value={plural(entries.length)} />
        <Stat
          label={canShopOnline ? "Ready to buy online" : "Delivered locally"}
          value={plural(canShopOnline ? readyToBuy : localOnly)}
        />
        {/*
          "Effort: Challenging", not "Challenging: a full weekend with help".
          A definition list's term names the category and its value answers it;
          the other way round reads as a warning shouted at the reader, and it
          made the difficulty the loudest word in a card about materials.
        */}
        <Stat label="Effort" value={difficulty} note={timeCategory} />
      </dl>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={handleShop} className="pk-btn pk-btn-primary sm:flex-none">
          {canShopOnline ? (
            <ShoppingCart className="h-4 w-4" aria-hidden />
          ) : (
            <Truck className="h-4 w-4" aria-hidden />
          )}
          {canShopOnline ? "Shop these materials" : "View shopping list"}
        </button>
        <button type="button" onClick={onPlan} className="pk-btn pk-btn-secondary sm:flex-none">
          View full project plan
          <ArrowDown className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/*
        The honest footnote, and the reason the button above can be trusted.
        A project that is half parcels and half truckloads says so here rather
        than letting somebody discover it three screens down.
      */}
      <p className="mt-3.5 max-w-prose text-sm text-ink-muted">
        {canShopOnline && localOnly > 0
          ? `${readyToBuy} ${readyToBuy === 1 ? "item ships" : "items ship"} to your door. The other ${localOnly} ${localOnly === 1 ? "comes" : "come"} by the load from a local supplier — we list the quantities to ask for.`
          : canShopOnline
            ? "Everything on this list can be ordered online. Quantities already include waste and round up to whole packages."
            : "This project is delivered by the load from a local supplier, so the materials are not ordered online. The list has the exact quantities to ask for when you call around."}
      </p>
    </section>
  );
}

/** "1 item", not "1 items". A count this prominent cannot get its own grammar wrong. */
function plural(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function Stat({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd
        className={`mt-1 tabular-nums ${
          emphasis
            ? "text-xl font-semibold text-brand-ink sm:text-2xl"
            : "text-lg font-semibold text-ink"
        }`}
      >
        {value}
        {note ? (
          <span className="mt-0.5 block text-xs font-normal text-ink-muted">{note}</span>
        ) : null}
      </dd>
    </div>
  );
}
