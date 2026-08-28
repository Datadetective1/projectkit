"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ShoppingCart } from "lucide-react";

/**
 * The one thing to do next, pinned to the bottom of a phone.
 *
 * This replaces `StickyCalculate`, which did the same job for a single action.
 * The redesign needs two — jump to the result, then get to the shopping list —
 * and two independently-positioned fixed bars would sooner or later render at
 * once and cover each other. One bar that changes its job by scroll position
 * cannot.
 *
 * The three states, in the order a thumb meets them:
 *
 *  1. **Form in view** → "See my result". On a phone the form runs past the
 *     fold, so after typing a measurement the next action is off-screen.
 *  2. **Result in view** → "Shop materials", with the count. This is the state
 *     the redesign exists for: the shopping list is still below the fold on a
 *     phone even after being moved up the page, and a person reading their
 *     number should not have to discover that buying is possible.
 *  3. **Shopping list in view** → nothing. A bar telling you to go somewhere
 *     you are already looking is noise.
 *
 * Mobile only. On desktop the form and the result sit side by side and the
 * whole results column is a short scroll.
 *
 * Two details keep it from becoming the usual sticky-bar nuisance. The page
 * reserves its height, so it never covers the last line of content — see the
 * `pb-*` on the planner's results column. And when hidden it is fully inert:
 * `invisible` plus `pointer-events-none` plus `tabIndex={-1}`, because a fixed
 * element that is merely translated off-screen still sits in the top layer and
 * can intercept clicks meant for whatever is at the bottom of the viewport.
 */
export function StickyAction({
  onCalculate,
  onShop,
  resultsRef,
  shoppingRef,
  itemsReady,
  canShopOnline,
  showShop,
  disabled,
}: {
  onCalculate: () => void;
  onShop: () => void;
  resultsRef: React.RefObject<HTMLDivElement | null>;
  shoppingRef: React.RefObject<HTMLDivElement | null>;
  /** How many materials can be bought online. Drives the count, never the copy alone. */
  itemsReady: number;
  canShopOnline: boolean;
  /** False until there is a valid result to shop for. */
  showShop: boolean;
  disabled?: boolean;
}) {
  const [resultsVisible, setResultsVisible] = useState(false);
  const [shoppingVisible, setShoppingVisible] = useState(false);

  useEffect(() => {
    const target = resultsRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setResultsVisible(entry.isIntersecting),
      // A sliver is enough: once the answer starts appearing, stop pointing at it.
      { rootMargin: "-96px 0px -55% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [resultsRef]);

  useEffect(() => {
    const target = shoppingRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setShoppingVisible(entry.isIntersecting),
      /*
       * Deliberately looser than the results observer. Reaching the shopping
       * list is the end of this bar's job, and a bar that flickers back on
       * because the list scrolled a few pixels out of frame is worse than one
       * that retires slightly early.
       */
      { rootMargin: "0px 0px -25% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [shoppingRef]);

  const mode: "calculate" | "shop" | "none" = !resultsVisible
    ? "calculate"
    : showShop && !shoppingVisible
      ? "shop"
      : "none";

  const hidden = mode === "none";

  return (
    <div
      // aria-hidden while off-screen so a screen-reader user is not offered a
      // control that is visually gone; the real buttons in the page are always
      // reachable and are the ones the keyboard tab order uses.
      aria-hidden={hidden}
      className={`pk-no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur transition-transform duration-200 sm:hidden ${
        hidden ? "pointer-events-none invisible translate-y-full" : "translate-y-0"
      } motion-reduce:transition-none`}
    >
      {mode === "shop" ? (
        <div className="flex items-center gap-3">
          {/*
            The count carries the message; the button carries the action.
            Splitting them is what lets the button stay a short, unambiguous
            verb on a 390px screen instead of wrapping to two lines.
          */}
          <p className="min-w-0 flex-1 text-sm leading-tight text-ink">
            <span className="font-semibold">
              {canShopOnline ? `${itemsReady} ${itemsReady === 1 ? "item" : "items"} ready` : "Your list is ready"}
            </span>
            <span className="block text-xs text-ink-muted">
              {canShopOnline ? "to buy online" : "quantities to order locally"}
            </span>
          </p>
          <button
            type="button"
            onClick={onShop}
            tabIndex={hidden ? -1 : 0}
            className="pk-btn pk-btn-primary h-12 shrink-0 px-5 text-base"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {canShopOnline ? "Shop materials" : "View list"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onCalculate}
          disabled={disabled}
          tabIndex={hidden ? -1 : 0}
          className="pk-btn pk-btn-primary h-12 w-full text-base"
        >
          See my result
          <ArrowDown className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
