import Link from "next/link";
import { ArrowRight, Download, FileText, Printer } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { DimensionLine } from "@/components/brand/DimensionLine";

/**
 * The Project Pack, given the one dark band on the page.
 *
 * Two problems solved at once. The pack is the most valuable thing the product
 * makes and it was previously a small white card among other white cards, so it
 * read as one more feature. And the page had no dark moment at all — an
 * unbroken field of paper and thin borders, which is exactly why "clean" was
 * turning into "flat".
 *
 * One full-bleed band of deep green fixes both: the pack is the thing you
 * remember, and the scroll finally has a floor to it.
 *
 * The document is presented as an actual stack of pages with the sections
 * ticking in one after another — the pattern 21st.dev calls a depth/stacked
 * card, done in CSS transforms rather than a scroll-linked animation library.
 * Nothing here loops, nothing follows the cursor, nothing hijacks the scroll.
 *
 * The section names are the real sections of a real pack, in the order a pack
 * contains them. It is a document mock, not a screenshot, and it does not
 * pretend otherwise.
 */

const SECTIONS: { name: string; detail: string }[] = [
  { name: "Project summary", detail: "What you are building, and the numbers behind it" },
  { name: "Materials", detail: "Every quantity, with waste and purchase rounding" },
  { name: "Budget", detail: "Costed at your prices, not ours" },
  { name: "Shopping list", detail: "Tickable, including the things people forget" },
  { name: "Project sequence", detail: "What order to do the work in" },
  { name: "Assumptions used", detail: "Every default, with its value" },
  { name: "How it was calculated", detail: "The formulas, in full" },
];

export function PackShowcase() {
  return (
    <section aria-labelledby="pack-heading" className="relative overflow-hidden bg-brand-deep">
      <div className="pk-rule-grid-dark pk-rule-fade absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        {/* --------------------------------------------------------- copy */}
        <Reveal>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-accent-warm">
            The thing you take with you
          </p>
          <h2
            id="pack-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Leave with a Project Pack, not a number
          </h2>
          <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-brand-mist">
            A calculator gives you a volume and stops. The pack is the document you actually use:
            what to buy, what it costs, what else you need, and what order to do it in — on your
            phone in the aisle, or printed and folded in a pocket.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              "Priced with your own numbers, not a national average",
              "Every assumption listed, so you can argue with it",
              "Prints on one sheet. Works with no signal.",
            ].map((line, index) => (
              <li
                key={line}
                className="pk-stagger-item flex gap-3 text-sm text-brand-mist"
                style={{ "--pk-delay": `${120 + index * 80}ms` } as React.CSSProperties}
              >
                <span aria-hidden className="mt-2 h-1 w-4 shrink-0 rounded-full bg-accent-warm/70" />
                {line}
              </li>
            ))}
          </ul>

          <Link
            href="/concrete-calculator"
            className="pk-btn mt-8 bg-white text-brand-ink hover:bg-brand-mist"
          >
            Create my Project Pack
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mt-3 text-xs text-brand-mist/70">Free while we are in beta. No account.</p>
        </Reveal>

        {/* ----------------------------------------------------- document */}
        <Reveal delay={120} className="relative">
          {/*
            Two pages behind the top one, rotated a degree apiece. It reads as a
            document with pages in it rather than a screenshot of a card, and it
            costs two empty divs.
          */}
          <div
            aria-hidden
            className="absolute inset-x-6 -top-3 h-16 rounded-t-[var(--radius-card)] border border-white/10 bg-white/[0.07]"
          />
          <div
            aria-hidden
            className="absolute inset-x-3 -top-1.5 h-16 rounded-t-[var(--radius-card)] border border-white/15 bg-white/[0.12]"
          />

          <div className="pk-marks relative overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[0_30px_60px_-24px_rgb(0_0_0_/_0.55)]">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" aria-hidden />
                <span className="text-sm font-semibold text-ink">Cubitora Project Pack</span>
              </span>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wide text-brand-ink">
                Free in beta
              </span>
            </div>

            <div className="px-5 pt-4">
              <p className="text-lg font-semibold tracking-tight text-ink">Concrete — 20 × 16 ft</p>
              <p className="mt-0.5 text-xs text-ink-subtle">
                Outdoor &amp; Structural · Challenging · A full weekend with help
              </p>
              <DimensionLine label="7 sections" className="mt-3 text-brand" delay={300} />
            </div>

            <ul className="mt-3 divide-y divide-line border-t border-line">
              {SECTIONS.map((section, index) => (
                <li
                  key={section.name}
                  className="pk-stagger-item flex items-baseline gap-3 px-5 py-2.5"
                  style={{ "--pk-delay": `${240 + index * 70}ms` } as React.CSSProperties}
                >
                  <span className="w-5 shrink-0 font-mono text-[0.625rem] text-ink-subtle">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{section.name}</span>
                    {/*
                      The detail line is the reason to want each section, and it
                      is worth the room on a wide screen. On a phone seven of
                      them push the CTA off the bottom of a second screen, and
                      the section names already carry the argument.
                    */}
                    <span className="hidden text-xs leading-snug text-ink-muted sm:block">
                      {section.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 border-t border-line bg-surface-sunken/60 px-5 py-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted">
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Print
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white">
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download PDF
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
