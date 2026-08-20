import { compute, threeNumbers } from "@/lib/answers/compute";
import { BigNumber } from "@/components/answers/AnswerShell";
import type { Computed } from "@/lib/answers/compute";
import type { ProjectDefinition } from "@/types/project";

/**
 * "How much sod for N square feet?" — shaped around how sod is actually sold.
 *
 * Nothing about this borrows the slab layout, because the decision is not the
 * same one. Sod has no thickness to choose and no mixing to avoid. It has one
 * awkward property instead: **it is sold by the pallet, and a pallet is a large
 * indivisible unit.** An area that overshoots a pallet by a few square feet
 * still buys the whole pallet, so the cheaper way to buy depends entirely on
 * where your lawn lands relative to that boundary.
 *
 * That is the insight the page is built on, and it is computed — the overshoot
 * comes from the planner's own pallet-coverage assumption, not from a rule.
 */

/** Lawn sizes spanning the pallet boundaries, so the overshoot pattern shows. */
const AREAS: [number, number][] = [
  [30, 15],
  [40, 20],
  [50, 20],
  [50, 30],
  [60, 40],
];

export function CoverageAnswer({
  project,
  computed,
}: {
  project: ProjectDefinition;
  computed: Computed;
}) {
  const numbers = threeNumbers(computed);
  const rolls = computed.row(/^rolls/i);
  const pallets = computed.row(/^pallets/i);
  const area = computed.row(/lawn area/i);

  const palletCoverage = Number(
    computed.result.assumptions
      .find((entry) => /pallet coverage/i.test(entry.label))
      ?.value.replace(/[^0-9.]/g, "") ?? 0,
  );

  const byPallet = computed.result.scenarios.find((scenario) =>
    /pallet/i.test(scenario.name),
  );
  const bySquareFoot = computed.result.scenarios.find((scenario) =>
    /square/i.test(scenario.name),
  );

  /* What buying whole pallets actually commits you to, versus what you need. */
  const palletCount = pallets?.value ?? 0;
  const needed = numbers.purchase;
  const palletTotal = palletCount * palletCoverage;
  const overshoot = area
    ? Math.round(palletTotal - (area.value ?? 0) * 1.05)
    : 0;

  const rows = AREAS.map(([length, width]) => {
    const run = compute(project.slug, { length, width });
    if (!run) return null;

    const runArea = run.row(/lawn area/i);
    const runPallets = run.row(/^pallets/i);
    const runBuy = run.row(/sod to buy/i);
    const pallet = run.result.scenarios.find((scenario) =>
      /pallet/i.test(scenario.name),
    );
    const sqft = run.result.scenarios.find((scenario) =>
      /square/i.test(scenario.name),
    );
    if (!runArea || !runPallets || !runBuy) return null;

    const covered = (runPallets.value ?? 0) * palletCoverage;
    const spare = Math.round(covered - (runBuy.value ?? 0));

    return {
      label: `${length} × ${width} ft`,
      area: run.fmt(runArea),
      buy: run.fmt(runBuy),
      pallets: run.fmt(runPallets),
      spare,
      byPallet: run.money(pallet?.totalCost),
      bySqFt: run.money(sqft?.totalCost),
      cheaper: (pallet?.recommended ? "pallet" : "square feet") as
        "pallet" | "square feet",
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <>
      {/* ---------------------------------------------------- the answer */}
      <section aria-labelledby="answer-heading">
        <h2 id="answer-heading" className="sr-only">
          The answer
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <BigNumber
            label="Sod to order"
            value={needed ?? numbers.withWaste}
            note={`Includes the ${numbers.wastePct ?? "5%"} allowance for cuts.`}
          />
          <BigNumber
            tone="plain"
            label="Rolls"
            value={computed.fmt(rolls)}
            note="If sold loose."
          />
          <BigNumber
            tone="plain"
            label="Pallets"
            value={computed.fmt(pallets)}
            note={`At ${palletCoverage} sq ft each — confirm with your farm.`}
          />
        </div>
        <p className="pk-prose mt-4 text-sm">
          {computed.result.explanation[0]}{" "}
          {computed.result.explanation[1]
            ? computed.result.explanation[1]
            : null}
        </p>
      </section>

      {/* --------------------------------------------- the pallet problem */}
      {overshoot > 0 ? (
        <section aria-labelledby="overshoot-heading">
          <h2
            id="overshoot-heading"
            className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
          >
            The bit that costs people money
          </h2>
          <div className="mt-4 rounded-[var(--radius-card)] border border-accent/25 bg-accent-soft p-5">
            <p className="text-[0.9375rem] leading-relaxed text-ink">
              You need <strong>{needed}</strong>. Whole pallets at{" "}
              {palletCoverage} sq ft each means buying{" "}
              <strong>{palletTotal.toLocaleString("en-US")} sq ft</strong> —
              about{" "}
              <strong>
                {overshoot.toLocaleString("en-US")} sq ft of grass you will not
                lay
              </strong>
              . Sod does not keep, so that is not spare stock; it is a cost.
            </p>
            {byPallet && bySquareFoot ? (
              <p className="pk-prose mt-3 text-sm">
                Priced both ways at this size:{" "}
                <strong className="text-ink">
                  {computed.money(byPallet.totalCost)}
                </strong>{" "}
                by the pallet against{" "}
                <strong className="text-ink">
                  {computed.money(bySquareFoot.totalCost)}
                </strong>{" "}
                by the square foot.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------- size table */}
      <section aria-labelledby="sizes-heading">
        <h2
          id="sizes-heading"
          className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
        >
          How the two prices compare by lawn size
        </h2>
        <p className="pk-prose mt-2 text-sm">
          Watch the spare column rather than the prices. Pallet buying is
          efficient when a lawn lands just under a whole pallet and wasteful
          when it lands just over — which is the whole reason to check before
          ordering.
        </p>

        {/*
            Focusable, and named.

            The table is wider than a phone, so this container scrolls — and a
            scrollable region with nothing focusable inside it cannot be reached
            by keyboard at all. axe flags it as `scrollable-region-focusable`,
            and it is right: without a tab stop the only way to read the
            right-hand columns is to touch the screen.
          */}
        <div
          className="mt-4 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Sod cost by pallet and by square foot across lawn sizes"
        >
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              Sod cost by pallet and by square foot across lawn sizes
            </caption>
            <thead>
              <tr className="border-b border-line-strong text-left">
                {[
                  "Lawn",
                  "To buy",
                  "Pallets",
                  "Spare",
                  "By pallet",
                  "By sq ft",
                ].map((heading) => (
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
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-line last:border-0"
                >
                  <th
                    scope="row"
                    className="py-2.5 pr-3 text-left font-medium text-ink"
                  >
                    {row.label}
                  </th>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-muted">
                    {row.buy}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink-muted">
                    {row.pallets}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-ink">
                    {row.spare.toLocaleString("en-US")} sq ft
                  </td>
                  <td
                    className={`py-2.5 pr-3 tabular-nums ${row.cheaper === "pallet" ? "font-semibold text-ink" : "text-ink-muted"}`}
                  >
                    {row.byPallet}
                  </td>
                  <td
                    className={`py-2.5 tabular-nums ${row.cheaper === "square feet" ? "font-semibold text-ink" : "text-ink-muted"}`}
                  >
                    {row.bySqFt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------------------------------------- laying notes */}
      <section aria-labelledby="order-heading">
        <h2
          id="order-heading"
          className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
        >
          Before you order
        </h2>
        <ul className="pk-prose mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>
            <strong className="text-ink">Confirm the pallet size.</strong>{" "}
            Coverage genuinely varies by farm, region and grass type. Cubitora
            assumes {palletCoverage} sq ft and lets you change it, because a
            wrong pallet size throws the whole order out.
          </li>
          <li>
            <strong className="text-ink">
              Order for one delivery, not two.
            </strong>{" "}
            Sod is perishable and should go down within a day or so of arriving.
            Running short means a second delivery of grass that no longer
            matches.
          </li>
          <li>
            <strong className="text-ink">
              Curved edges waste more than {numbers.wastePct ?? "5%"}.
            </strong>{" "}
            The allowance suits a rectangular lawn. Beds, paths and curves cut
            into more pieces.
          </li>
        </ul>
      </section>
    </>
  );
}
