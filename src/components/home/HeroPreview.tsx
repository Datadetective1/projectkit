import { ArrowDown, Check } from "lucide-react";

/**
 * The hero's right-hand column: one real project, shown as idea → plan.
 *
 * This is the most persuasive asset the product has and it used to sit below
 * the fold. A visitor who only sees a search box has to *imagine* what comes
 * out; a visitor who sees "a 20 × 16 concrete patio" turn into 4.35 yd³ and a
 * shopping list already understands the product.
 *
 * Every figure here is genuine output from the concrete planner at its
 * defaults — 20 × 16 ft, 4 in thick, 10% waste, Cubitora planning prices. It is
 * labelled as an example rather than dressed up as live, because a planning
 * tool that fakes its own numbers has nothing left to sell.
 *
 * Server-rendered and static: no JavaScript, no layout shift, and the numbers
 * are in the HTML for crawlers and answer engines to read.
 */

const SUMMARY: [string, string][] = [
  ["Base gravel", "4.50 yd³"],
  ["Welded wire mesh", "336 sq ft"],
  ["Form boards", "79 linear ft"],
];

export function HeroPreview() {
  return (
    <div className="flex flex-col gap-3">
      {/* ---------------------------------------------------------- input */}
      <figure className="rounded-[var(--radius-card)] border border-line bg-surface-sunken p-4">
        <figcaption className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-subtle">
          Your idea
        </figcaption>
        <p className="mt-1.5 text-[0.9375rem] text-ink">
          &ldquo;I want to build a 20 × 16 concrete patio&rdquo;
        </p>
      </figure>

      <div className="flex justify-center" aria-hidden>
        <ArrowDown className="h-4 w-4 text-ink-subtle" />
      </div>

      {/* ----------------------------------------------------------- plan */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-sm">
        <div className="border-b border-line bg-brand-soft px-5 py-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-brand-ink/70">
            Cubitora plan
          </p>
          <p className="mt-1 text-[2.5rem] font-semibold leading-none tracking-tight text-brand-ink">
            4.35<span className="ml-1.5 text-xl font-medium">yd³</span>
          </p>
          <p className="mt-1.5 text-sm text-brand-ink/80">
            Order 4.50 yd³ — includes 10% waste
          </p>
        </div>

        {/* Two figures people actually decide on: what it costs, how many
            things they have to buy. */}
        <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
          <div className="px-5 py-3.5">
            <p className="text-xl font-semibold tabular-nums text-ink">$990</p>
            <p className="mt-0.5 text-xs text-ink-muted">Planning estimate</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-xl font-semibold tabular-nums text-ink">8</p>
            <p className="mt-0.5 text-xs text-ink-muted">Materials to buy</p>
          </div>
        </div>

        <dl className="divide-y divide-line px-5">
          {SUMMARY.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="text-sm font-medium tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-2 border-t border-line bg-surface-sunken/60 px-5 py-3">
          <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          <p className="text-sm font-medium text-ink">
            Shopping list and Project Pack ready
          </p>
        </div>
      </div>

      <p className="text-xs text-ink-subtle">
        Real output from the concrete planner at 20 × 16 ft, 4 in thick.
      </p>
    </div>
  );
}
