"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that settles into place instead of appearing.
 *
 * The point is comprehension, not decoration: watching 0 → 4.35 tells you the
 * figure was *worked out*, which is the one thing a calculator has to convince
 * you of. It runs once, when the number scrolls into view.
 *
 * Borrowed from the 21st.dev "Count Up" component, minus its dependencies
 * (`motion/react` + `react-use-measure`): the technique worth taking is that
 * the text must be **tabular-nums and width-reserved**, or every tick of the
 * animation re-measures the text and nudges everything beside it. This renders
 * the final string invisibly underneath to hold the exact width, so the
 * counting costs zero layout shift.
 *
 * Reduced motion gets the final value immediately — the number is information,
 * so it is never the thing that gets withheld.
 */
export function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
  delay = 0,
  className = "",
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState<number | null>(null);

  const format = (n: number) =>
    `${prefix}${n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    /*
     * Reduced motion, or a browser without the observer, gets the final number
     * and nothing else — by doing nothing at all. `value` stays null, and the
     * render below already falls back to the target in that case, so the figure
     * is correct from the very first paint with no state update to schedule.
     */
    if (reduced || typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    let timer: ReturnType<typeof setTimeout>;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        /*
         * Clamped at both ends, and the lower end is the one that matters.
         *
         * A requestAnimationFrame callback is handed the frame's start time,
         * which can be *earlier* than a performance.now() read taken moments
         * before it — so the first frame could compute a negative progress,
         * and easing a negative t overshoots backwards past zero. The counter
         * flashed "-2" on its way to 449. Caught by sampling the values
         * mid-transition rather than by watching it.
         */
        const t = Math.min(Math.max((now - start) / duration, 0), 1);
        // Ease-out cubic: fast enough to feel responsive, slow enough at the
        // end that the final digits are readable as they land.
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(to * eased);
        if (t < 1) frame = requestAnimationFrame(tick);
        else setValue(to);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            timer = setTimeout(run, delay);
          }
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [to, duration, delay]);

  return (
    <span ref={ref} className={`relative inline-block tabular-nums ${className}`}>
      {/*
        The finished string, invisible, holding the width. Without it a value
        counting from "0" to "1,240" grows by three characters mid-animation and
        drags its neighbours along with it.
      */}
      <span aria-hidden className="invisible">
        {format(to)}
      </span>
      <span aria-hidden className="absolute left-0 top-0">
        {format(value ?? to)}
      </span>
      {/* Screen readers get the number, once, without the intermediate frames. */}
      <span className="sr-only">{format(to)}</span>
    </span>
  );
}
