"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { PlanDiagram } from "@/components/brand/DimensionLine";
import type { HeroProject } from "@/lib/home/heroData";

/**
 * The hero's demonstration: an idea turning into a plan, on the spot.
 *
 * The previous version showed one finished result in a static card. It was
 * honest and it was dull — it told you the answer without showing you that
 * anything had been *worked out*, which is the only thing that separates this
 * from a search result. Someone deciding whether to trust a tool with a
 * thousand-dollar material order needs to see the working.
 *
 * So this shows the whole chain, in the order it happens:
 *
 *   the sentence you typed → what that measures → what it works out to →
 *   what you actually have to buy → what it costs
 *
 * Two ideas borrowed from 21st.dev, both adapted rather than installed:
 *
 *  - the **icon rail that switches the preview** (Preview Switch Hero) — here
 *    it switches between three real projects, which turns the hero from a
 *    poster into something you can poke at. Cheapest possible way to answer
 *    "does it do *my* project?" in the first five seconds.
 *  - the **number that counts into place** (Count Up), rebuilt without its
 *    dependencies. See components/motion/CountUp.
 *
 * Every figure is real output from the deterministic engine at its documented
 * defaults, computed on the server — see lib/home/heroData.ts. Nothing here is
 * illustrative, because a planning tool that fakes its own numbers has nothing
 * left to sell.
 */
/**
 * The recalculation, as one budget.
 *
 * Switching project should read as an instrument working through a
 * calculation, not as a card being swapped: the footprint is drawn, the
 * measurements come off it, the quantity resolves, and the price lands last —
 * which is the order the arithmetic actually happens in.
 *
 * Everything finishes inside ~700ms. That ceiling is doing real work: below
 * about 400ms the sequence is a flicker and reads as a glitch, and past 700ms
 * a person who clicked "Deck" is waiting for a website to finish being
 * decorative. The stages overlap rather than queue, so the whole thing is
 * quicker than the sum of its parts.
 */
const DIAGRAM_MS = 480;
const STAGE_DELAY = 90;
const HEADLINE_DELAY = 150;
const DECIDE_DELAY = 230;
const COUNT_MS = 460;

export function HeroShowcase({ projects }: { projects: HeroProject[] }) {
  const [activeSlug, setActiveSlug] = useState(projects[0]?.slug);
  const active = projects.find((project) => project.slug === activeSlug) ?? projects[0];

  if (!active) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* ----------------------------------------------------------- rail */}
      <div
        role="tablist"
        aria-label="Example projects"
        className="flex items-center gap-1.5 self-start rounded-full border border-line bg-surface/80 p-1 backdrop-blur-sm"
      >
        {projects.map((project) => {
          const selected = project.slug === active.slug;
          return (
            <button
              key={project.slug}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="hero-panel"
              onClick={() => setActiveSlug(project.slug)}
              /*
                44px tall on a phone. At 32 it cleared the WCAG minimum and
                still missed under a thumb, which is the standard this actually
                has to meet — it is the first thing anyone touches on the page.
                Back to a compact chip once there is a pointer.
              */
              className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors sm:min-h-0 sm:px-3.5 sm:py-1.5 ${
                selected
                  ? "bg-brand text-white"
                  : "text-ink-muted hover:bg-brand-soft hover:text-brand-ink"
              }`}
            >
              {project.name}
            </button>
          );
        })}
      </div>

      <div
        id="hero-panel"
        role="tabpanel"
        aria-label={`${active.name} example`}
        style={{ "--pk-draw-duration": `${DIAGRAM_MS}ms` } as React.CSSProperties}
        className="pk-marks pk-drawn overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[0_18px_44px_-28px_rgb(6_48_42_/_0.45)]"
      >
        {/* ------------------------------------------------------- idea */}
        <div className="border-b border-line bg-surface-sunken px-5 py-3.5">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-subtle">
            You type
          </p>
          {/* Fixed height so switching projects does not nudge the layout. */}
          <p
            key={`idea-${active.slug}`}
            className="pk-swap mt-1 line-clamp-2 min-h-[2.75rem] text-[0.9375rem] leading-snug text-ink"
          >
            &ldquo;{active.idea}&rdquo;
          </p>
        </div>

        {/* --------------------------------------------- measure + result */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-4 px-5 pb-4 pt-4 sm:gap-5">
          {active.plan ? (
            /*
             * Keyed on the slug so the element is replaced rather than
             * updated, which is what replays the stroke-dashoffset animation:
             * the footprint is re-drawn line by line, and the two dimension
             * annotations follow it in. It is the same drawing you would make
             * on the back of an envelope, made again for the new project.
             */
            <PlanDiagram
              key={`plan-${active.slug}`}
              width={active.plan.width}
              depth={active.plan.depth}
              className="h-[6.25rem] w-[9.5rem] shrink-0 text-brand"
            />
          ) : null}

          <dl className="min-w-0">
            {active.stages.map((stage, index) => (
              <div
                key={`${active.slug}-${stage.label}`}
                className="pk-swap flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5 last:border-0"
                style={{ "--pk-delay": `${STAGE_DELAY + index * 55}ms` } as React.CSSProperties}
              >
                <dt className="truncate text-[0.8125rem] text-ink-muted">{stage.label}</dt>
                <dd className="shrink-0 font-mono text-[0.8125rem] font-medium tabular-nums text-ink">
                  {stage.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ---------------------------------------------------- headline */}
        <div className="border-y border-brand/15 bg-brand-soft px-5 py-4">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand-ink/70">
            Cubitora works out
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 text-[2.5rem] font-semibold leading-none tracking-tight text-brand-ink">
            {/* Keyed on the slug so switching replays the count. */}
            <CountUp
              key={`headline-${active.slug}`}
              to={active.headline.value}
              decimals={active.headline.decimals}
              duration={COUNT_MS}
              delay={HEADLINE_DELAY}
            />
            <span
              key={`unit-${active.slug}`}
              className="pk-swap text-lg font-medium"
              style={{ "--pk-delay": `${HEADLINE_DELAY}ms` } as React.CSSProperties}
            >
              {active.headline.unit}
            </span>
          </p>
          <p
            key={`sub-${active.slug}`}
            className="pk-swap mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-brand-ink/80"
            style={{ "--pk-delay": `${HEADLINE_DELAY + 60}ms` } as React.CSSProperties}
          >
            {active.headline.label}
          </p>
        </div>

        {/* ------------------------------------------------------- decide */}
        {/*
          The three figures someone actually decides on. They arrive last and
          together, which is the order the calculation happens in: measure,
          work out, then price.
        */}
        <div className="grid grid-cols-3 divide-x divide-line">
          <div className="px-4 py-3">
            <p className="text-lg font-semibold tabular-nums text-ink">
              <CountUp
                key={`cost-${active.slug}`}
                to={active.cost}
                prefix="$"
                duration={COUNT_MS}
                delay={DECIDE_DELAY}
              />
            </p>
            <p className="mt-0.5 text-[0.6875rem] leading-tight text-ink-muted">Materials</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-lg font-semibold tabular-nums text-ink">
              <CountUp
                key={`count-${active.slug}`}
                to={active.materialCount}
                duration={COUNT_MS}
                delay={DECIDE_DELAY}
              />
            </p>
            <p className="mt-0.5 text-[0.6875rem] leading-tight text-ink-muted">Things to buy</p>
          </div>
          <div className="px-4 py-3">
            <p
              key={`difficulty-${active.slug}`}
              className="pk-swap truncate text-lg font-semibold text-ink"
              style={{ "--pk-delay": `${DECIDE_DELAY}ms` } as React.CSSProperties}
            >
              {active.difficulty}
            </p>
            <p
              key={`time-${active.slug}`}
              className="pk-swap mt-0.5 truncate text-[0.6875rem] leading-tight text-ink-muted"
              style={{ "--pk-delay": `${DECIDE_DELAY + 50}ms` } as React.CSSProperties}
            >
              {active.time}
            </p>
          </div>
        </div>

        <Link
          href={`/${active.slug}`}
          className="group flex items-center gap-2 border-t border-line bg-surface-sunken/70 px-5 py-3 transition-colors hover:bg-brand-soft"
        >
          <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span className="text-sm font-medium text-ink">
            Shopping list and Project Pack ready
          </span>
          <ArrowRight
            className="ml-auto h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
            aria-hidden
          />
        </Link>
      </div>

      <p className="text-xs text-ink-subtle">
        Real output from the {active.name.toLowerCase()} planner at its default settings — not an
        illustration.
      </p>
    </div>
  );
}
