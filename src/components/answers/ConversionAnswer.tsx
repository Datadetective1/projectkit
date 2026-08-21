import { compute, scenarioSplit, threeNumbers } from "@/lib/answers/compute";
import { BigNumber } from "@/components/answers/AnswerShell";
import type { Computed } from "@/lib/answers/compute";
import type { ProjectDefinition } from "@/types/project";

/**
 * "How many bags in a cubic yard?" — a conversion, not a project.
 *
 * Shaped around how mulch is actually bought, which is nothing like how
 * concrete is bought, so this shares no layout with the size pages. The buying
 * decision has two parts and neither is the headline conversion:
 *
 *  1. **Bag size decides the answer.** A cubic yard is 27 cubic feet; the bag
 *     in front of you might be 1.5, 2 or 3 of them. Publishing one number
 *     without the bag size — which most pages do — is publishing a guess.
 *  2. **Depth decides the volume.** Two inches over an existing bed against
 *     four on bare soil is double the mulch, and it is the input people are
 *     least deliberate about.
 *
 * Both tables are real evaluations. The bag-size table is pure arithmetic on
 * the engine's own documented bag-size assumption.
 */

/** Bag sizes actually sold. The engine's default is 2 cu ft. */
const BAG_SIZES = [1.5, 2, 3];

/** Depths the planner treats as sensible, against a fixed 500 sq ft bed. */
const DEPTHS = [2, 3, 4];

const CUBIC_FEET_PER_YARD = 27;

export function ConversionAnswer({
  project,
  computed,
}: {
  project: ProjectDefinition;
  computed: Computed;
}) {
  const bagRows = BAG_SIZES.map((size) => ({
    size,
    perYard: CUBIC_FEET_PER_YARD / size,
  }));

  const depthRows = DEPTHS.map((depth) => {
    const run = compute(project.slug, { shape: "custom", area: 500, depth });
    if (!run) return null;

    const numbers = threeNumbers(run);
    const bags = run.row(/equivalent bags/i);
    const { recommended, alternative } = scenarioSplit(run);

    return {
      depth,
      volume: numbers.calculated,
      order: numbers.purchase,
      bags: bags ? run.fmt(bags) : "—",
      bulk: run.money(recommended?.totalCost ?? alternative?.totalCost),
      bagged: run.money(
        run.result.scenarios.find((scenario) => /bagged/i.test(scenario.name))?.totalCost,
      ),
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  const bagSizeAssumption = computed.result.assumptions.find((entry) =>
    /bag size/i.test(entry.label),
  );

  return (
    <>
      {/* ---------------------------------------------------- the answer */}
      <section aria-labelledby="answer-heading">
        <h2 id="answer-heading" className="sr-only">
          The answer
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {bagRows.map((row) => (
            <BigNumber
              key={row.size}
              tone={row.size === 2 ? "brand" : "plain"}
              label={`${row.size} cu ft bags`}
              value={`${row.perYard % 1 === 0 ? row.perYard : row.perYard.toFixed(1)}`}
              note={`per cubic yard${row.size === 2 ? " — the most common bag" : ""}`}
            />
          ))}
        </div>
        <p className="pk-prose mt-4 text-sm">
          A cubic yard is 27 cubic feet, so the count is just 27 divided by the bag. That is why an
          answer given without a bag size is not much of an answer — the same yard is nine bags or
          eighteen depending on which pallet you are standing next to. Cubitora assumes{" "}
          <strong className="text-ink">{bagSizeAssumption?.value ?? "2 cu ft"}</strong> and lets you
          change it.
        </p>
      </section>

      {/* --------------------------------------------- what it means for a bed */}
      <section aria-labelledby="bed-heading">
        <h2 id="bed-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          What that means for an actual bed
        </h2>
        <p className="pk-prose mt-2 text-sm">
          The conversion is rarely what someone needs on its own — they need the bag count for their
          bed. Here is a 500 sq ft bed at each sensible depth, run through the mulch planner.
        </p>

        {/*
          Focusable, and named.

          This table is wider than a phone, so the container scrolls — and a
          scrollable region with nothing focusable inside it cannot be reached
          by keyboard at all. axe flags it as `scrollable-region-focusable`,
          and it is right: without a tab stop the only way to read the
          right-hand columns is to touch the screen.
        */}
        <div
          className="mt-4 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Mulch needed for a 500 square foot bed by depth"
        >
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="sr-only">
              A 500 square foot bed at two, three and four inches deep
            </caption>
            <thead>
              <tr className="border-b border-line-strong text-left">
                {["Depth", "Volume", "Order", "Bags", "Bulk", "Bagged"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="py-2 pr-3 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depthRows.map((row) => (
                <tr
                  key={row.depth}
                  className={`border-b border-line last:border-0 ${row.depth === 3 ? "bg-brand-soft/45" : ""}`}
                >
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink">
                    {row.depth} in
                    {row.depth === 3 ? (
                      <span className="ml-1.5 font-mono text-[0.625rem] uppercase text-brand">
                        typical
                      </span>
                    ) : null}
                  </th>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-muted">{row.volume}</td>
                  <td className="py-2.5 pr-3 font-medium tabular-nums text-ink">{row.order}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink">{row.bags}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-muted">{row.bulk}</td>
                  <td className="py-2.5 tabular-nums text-ink-muted">{row.bagged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="pk-prose mt-4 text-sm">
          Two things fall out of that table. Depth scales the order exactly — double the depth,
          double the mulch — and bags cost meaningfully more than the same volume delivered loose,
          at every depth. What bags buy is not a lower price; it is no delivery to schedule and no
          pile on the driveway.
        </p>
      </section>

      {/* ------------------------------------------------- when bags win */}
      <section aria-labelledby="bags-heading">
        <h2 id="bags-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          When bags are still the right call
        </h2>
        <ul className="pk-prose mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>
            <strong className="text-ink">Under about a cubic yard.</strong> That is roughly a
            hundred square feet at three inches — below it, bulk delivery is not worth arranging and
            the planner recommends bags.
          </li>
          <li>
            <strong className="text-ink">Nowhere to put a pile.</strong> Bulk arrives as a heap that
            has to sit somewhere and be moved by barrow.
          </li>
          <li>
            <strong className="text-ink">Topping up rather than starting over.</strong> A thin
            refresh over existing mulch is a handful of bags, not a delivery.
          </li>
        </ul>
      </section>
    </>
  );
}
