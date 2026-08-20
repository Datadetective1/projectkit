import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import type { Comparison } from "@/lib/home/compareData";

/**
 * The most persuasive thing the product does, shown rather than described.
 *
 * Ready-mix versus bagged concrete for the same patio is a real, large,
 * frequently-guessed-at decision. Putting the actual figures on the homepage
 * makes the argument for the tool better than any sentence about "smart
 * calculations" could: here is a choice that costs several hundred dollars, and
 * here is the answer before you leave the house.
 *
 * Asymmetric on purpose — a big number on the left, the two options on the
 * right — because a third identical card grid was the problem this pass exists
 * to fix. Both figures come from the engine (see lib/home/compareData.ts).
 */
export function CompareSection({ comparison }: { comparison: Comparison | null }) {
  if (!comparison) return null;

  const savingNumber = Number(comparison.saving.replace(/[^0-9.]/g, ""));

  return (
    <section aria-labelledby="compare-heading" className="border-b border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
          {/* -------------------------------------------------- the number */}
          <Reveal>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-brand">
              Before you spend
            </p>
            <h2
              id="compare-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            >
              Compare your options before you spend money
            </h2>
            {/*
              Two sentences, not four. The two priced cards and the figure
              below already say "we costed both options" — spelling it out in
              prose as well was the paragraph arguing with the evidence.
            */}
            <p className="pk-prose mt-4 max-w-md">
              The same {comparison.project.toLowerCase()} patio, two ways of buying it. Most people
              choose by guessing.
            </p>

            <p className="mt-8 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-subtle">
              Difference on this one decision
            </p>
            <p className="mt-1 text-[3.25rem] font-semibold leading-none tracking-tight text-brand">
              <CountUp to={savingNumber} prefix="$" duration={1000} />
            </p>
            <p className="pk-prose mt-2 text-sm">{comparison.context}.</p>
          </Reveal>

          {/* ------------------------------------------------- the options */}
          <Reveal delay={100}>
            <div className="grid gap-4 sm:grid-cols-2">
              {comparison.options.map((option, index) => (
                <div
                  key={option.name}
                  className={`pk-stagger-item pk-card relative flex flex-col p-5 ${
                    option.recommended
                      ? "border-brand/40 bg-brand-soft/40 shadow-[0_10px_30px_-18px_rgb(6_48_42_/_0.5)]"
                      : ""
                  }`}
                  style={{ "--pk-delay": `${140 + index * 110}ms` } as React.CSSProperties}
                >
                  {option.recommended ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand px-2.5 py-1 font-mono text-[0.625rem] font-semibold uppercase tracking-wide text-white">
                      <Check className="h-3 w-3" aria-hidden />
                      Cheaper here
                    </span>
                  ) : (
                    <span className="inline-flex w-fit rounded-full border border-line-strong px-2.5 py-1 font-mono text-[0.625rem] font-semibold uppercase tracking-wide text-ink-subtle">
                      Alternative
                    </span>
                  )}

                  <h3 className="mt-3.5 text-base font-semibold text-ink">{option.name}</h3>
                  <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-ink">
                    {option.cost}
                  </p>
                  <p className="mt-1.5 font-mono text-xs text-ink-subtle">{option.quantity}</p>
                  <p className="pk-prose mt-3 flex-1 text-sm leading-snug">{option.summary}</p>
                </div>
              ))}
            </div>

            <Link
              href={`/${comparison.slug}`}
              className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
            >
              Run this with your own dimensions
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
                aria-hidden
              />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
