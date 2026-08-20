"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Reveal children when they scroll into view.
 *
 * 21st.dev has several versions of this and every one of them pulls in
 * `motion/react`. That is ~35 KB gzipped to fade some sections in, on a site
 * whose whole argument is that it loads fast and does not shift — so this is
 * an IntersectionObserver and a CSS transition instead. The visual result is
 * the same; the bundle cost is zero.
 *
 * Three rules it follows:
 *
 *  - **Children are laid out at full size from the first paint.** Only opacity
 *    and transform change, and neither affects layout, so this cannot move the
 *    page. The CLS work already done here is not being spent on decoration.
 *  - **It reveals once.** A section that re-fades every time it scrolls past is
 *    a distraction, not a reveal.
 *  - **Content is never hostage to JavaScript.** A `<noscript>` rule in the
 *    layout forces the revealed state, and reduced motion skips straight to it.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
  /** How far into the viewport before it fires. Negative pulls it later. */
  rootMargin = "0px 0px -12% 0px",
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Once revealed there is nothing left to watch for, and re-running the
    // effect is what tears the listeners back down again.
    if (revealed) return;

    const node = ref.current;
    if (!node) return;

    /*
     * The safety net, and the fallback, and the initial state — all one check.
     *
     * An observer reports threshold *crossings*. Jump from above a section to
     * below it in a single frame — a fling on a phone, Ctrl+End, a restored
     * scroll position on reload — and nothing is ever crossed, so the callback
     * never runs and that section stays at opacity 0 for the rest of the
     * session. That is a content bug, not an animation bug, so it gets a real
     * fix: a rect check, run once on the next frame and again on scroll.
     *
     * It doubles as the answer for a browser with no IntersectionObserver at
     * all, which is why there is no special case for one.
     */
    const check = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) setRevealed(true);
    };

    const initial = requestAnimationFrame(check);

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        check();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
                  setRevealed(true);
                }
              }
            },
            { rootMargin, threshold: 0.05 },
          );

    observer?.observe(node);

    return () => {
      cancelAnimationFrame(initial);
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootMargin, revealed]);

  return (
    <Tag
      ref={ref}
      className={`pk-reveal ${className}`}
      data-revealed={revealed ? "true" : "false"}
      style={delay ? ({ "--pk-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
