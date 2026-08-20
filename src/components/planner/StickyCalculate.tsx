"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

/**
 * A mobile-only jump to the result.
 *
 * On a phone the form runs past the fold, so after typing a measurement the
 * next action is off-screen and the user has to hunt for it. This keeps it a
 * thumb away.
 *
 * Two things stop it becoming the usual sticky-bar nuisance:
 *
 *  - It hides once the results are actually on screen. A bar telling you to go
 *    somewhere you are already looking is noise.
 *  - The page reserves its height, so it never covers the last line of content
 *    — see the `pb-*` on the planner page.
 *
 * Mobile only. On desktop the form and the result sit side by side and there is
 * nothing to jump to.
 */
export function StickyCalculate({
  onCalculate,
  resultsRef,
  disabled,
}: {
  onCalculate: () => void;
  resultsRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
}) {
  const [resultsVisible, setResultsVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = resultsRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setResultsVisible(entry.isIntersecting),
      // A sliver is enough: once the answer starts appearing, step out of the way.
      { rootMargin: "-96px 0px -55% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [resultsRef]);

  return (
    <div
      ref={barRef}
      // aria-hidden while off-screen so a screen-reader user is not offered a
      // control that is visually gone; the real button in the form is always
      // reachable and is the one the keyboard tab order uses.
      aria-hidden={resultsVisible}
      /*
       * Fully inert when hidden. A fixed element that is merely translated
       * off-screen still sits in the top layer, and anything at the bottom of
       * the viewport can end up behind it — which is exactly the kind of
       * intermittent click interception that makes a suite flaky.
       */
      className={`pk-no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur transition-transform duration-200 sm:hidden ${
        resultsVisible
          ? "pointer-events-none invisible translate-y-full"
          : "translate-y-0"
      } motion-reduce:transition-none`}
    >
      <button
        type="button"
        onClick={onCalculate}
        disabled={disabled}
        tabIndex={resultsVisible ? -1 : 0}
        className="pk-btn pk-btn-primary h-12 w-full text-base"
      >
        See my result
        <ArrowDown className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
