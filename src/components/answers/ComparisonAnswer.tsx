import { Check } from "lucide-react";
import { compute, threeNumbers } from "@/lib/answers/compute";
import type { Computed } from "@/lib/answers/compute";
import type { ProjectDefinition } from "@/types/project";

/**
 * Ready-mix against bagged, priced across every common slab size.
 *
 * Competing pages answer this with a remembered rule — "bagged is cheaper under
 * a yard and a half". That rule is wrong in an interesting way, and the engine
 * can show why: **ready-mix material is cheaper at every size on this page.**
 * Bagged only wins below about a cubic yard, and not on price — it wins because
 * a supplier will not send a truck for that little, and Cubitora's ready-mix
 * figure excludes the short-load fee that would make them.
 *
 * That distinction is the entire value of the page, and it is only available
 * because the recommendation comes from the planner's own rule rather than from
 * whoever wrote the article.
 *
 * Every row is a real evaluation at those dimensions. The crossover is found by
 * scanning the rows, not asserted.
 */

/** Slab sizes people actually build, spanning both sides of the threshold. */
const SIZES: [number, number][] = [
  [4, 4],
  [6, 6],
  [8, 8],
  [10, 10],
  [12, 12],
  [16, 16],
  [20, 20],
  [24, 24],
];

export function ComparisonAnswer({ project }: { project: ProjectDefinition; computed: Computed }) {
  const rows = SIZES.map(([length, width]) => {
    const run = compute(project.slug, { length, width, thickness: 4 });
    if (!run) return null;

    const numbers = threeNumbers(run);
    const readyMix = run.result.scenarios.find((scenario) => /ready/i.test(scenario.name));
    const bagged = run.result.scenarios.find((scenario) => /bag/i.test(scenario.name));
    if (!readyMix || !bagged) return null;

    return {
      label: `${length} × ${width} ft`,
      order: numbers.purchase ?? numbers.withWaste,
      readyMix: run.money(readyMix.totalCost),
      bagged: run.money(bagged.totalCost),
      bags: run.fmt(bagged.rows.find((row) => row.measure !== "currency")),
      winner: readyMix.recommended ? ("ready-mix" as const) : ("bagged" as const),
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  // Where the recommendation changes — read off the rows rather than declared.
  const flipIndex = rows.findIndex((row) => row.winner === "ready-mix");
  const lastBagged = flipIndex > 0 ? rows[flipIndex - 1] : null;
  const firstReadyMix = flipIndex >= 0 ? rows[flipIndex] : null;

  return (
    <>
      {/* ------------------------------------------------- the short answer */}
      <section aria-labelledby="short-heading">
        <h2 id="short-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          The short answer
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-brand/30 bg-brand-soft p-5">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand-ink/70">
              Above about a cubic yard
            </p>
            <p className="mt-1.5 text-xl font-semibold text-brand-ink">Ready-mix</p>
            <p className="mt-1.5 text-sm leading-snug text-brand-ink/85">
              Cheaper per cubic yard, and one pour instead of an afternoon of mixing.
              {firstReadyMix
                ? ` A ${firstReadyMix.label} slab is the first size here where a delivery makes sense.`
                : null}
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-subtle">
              Below about a cubic yard
            </p>
            <p className="mt-1.5 text-xl font-semibold text-ink">Bags</p>
            <p className="mt-1.5 pk-prose text-sm leading-snug">
              Not because the material is cheaper — it is not — but because no supplier will send a
              truck for that little without a fee that swallows the difference.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- the table */}
      <section aria-labelledby="table-heading">
        <h2 id="table-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Both options, priced at every common slab size
        </h2>
        <p className="pk-prose mt-2 text-sm">
          Each row is the concrete planner run at those dimensions, four inches thick, including
          the same waste allowance and purchase rounding a real order gets.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              Ready-mix and bagged concrete cost compared across eight slab sizes
            </caption>
            <thead>
              <tr className="border-b border-line-strong text-left">
                {["Slab", "Order", "Ready-mix", "Bagged", "Bags to mix", "Cheaper to use"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="py-2 pr-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={`border-b border-line last:border-0 ${
                    row === firstReadyMix ? "bg-brand-soft/45" : ""
                  }`}
                >
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink">
                    {row.label}
                  </th>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-muted">{row.order}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink">{row.readyMix}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink">{row.bagged}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-muted">{row.bags}</td>
                  <td className="py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wide ${
                        row.winner === "ready-mix"
                          ? "bg-brand text-white"
                          : "border border-line-strong text-ink-muted"
                      }`}
                    >
                      {row.winner === "ready-mix" ? (
                        <Check className="h-3 w-3" aria-hidden />
                      ) : null}
                      {row.winner}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {lastBagged && firstReadyMix ? (
          <p className="pk-prose mt-4 text-sm">
            The recommendation changes between <strong className="text-ink">{lastBagged.label}</strong>{" "}
            and <strong className="text-ink">{firstReadyMix.label}</strong> — the point where the
            order passes one cubic yard. Notice what the money does across that boundary: ready-mix
            is the cheaper material on <em>both</em> rows, and on every row above and below them.
            Bags win the smaller job on practicality, not price.
          </p>
        ) : null}
      </section>

      {/* ------------------------------------------------ what it leaves out */}
      <section aria-labelledby="excluded-heading">
        <h2
          id="excluded-heading"
          className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
        >
          What these prices leave out
        </h2>
        <p className="pk-prose mt-2 text-sm">
          Both columns are material only, and the omissions land on opposite sides — which is why
          the table alone should not make the decision for a job near the threshold.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">Ready-mix leaves out</h3>
            <ul className="pk-prose mt-2 list-disc space-y-1 pl-4 text-sm">
              <li>Delivery, which is charged per load</li>
              <li>Short-load fees under the supplier&rsquo;s minimum</li>
              <li>Waiting time if the site is not ready when the truck is</li>
            </ul>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">Bags leave out</h3>
            <ul className="pk-prose mt-2 list-disc space-y-1 pl-4 text-sm">
              <li>Mixer hire, unless you are mixing in a barrow</li>
              <li>Your day — and a second pair of hands on anything but a small pad</li>
              <li>
                The risk of a cold joint if the mixing falls behind the pour
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
