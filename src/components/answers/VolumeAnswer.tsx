import type { ReactNode } from "react";
import { compute } from "@/lib/answers/compute";
import {
  GRAVEL_MATERIALS,
  amountLabel,
  gravelForTons,
  gravelForYards,
  mulchForYards,
} from "@/lib/answers/volume";
import { BigNumber } from "@/components/answers/AnswerShell";
import type { Computed } from "@/lib/answers/compute";
import type { AnswerPage } from "@/types/answer";

/**
 * "What is 3 yards of mulch?" and "how many yards is 10 tons of gravel?"
 *
 * A volume page starts from an amount someone already has, or has just been
 * quoted, and turns it into the things they actually plan with: bags, weight,
 * how far it spreads, and what it costs. Every figure is a planner run at
 * inputs chosen to hold exactly that amount (see `lib/answers/volume`).
 */

const MULCH_BAGS = [2, 1.5, 3];
const MULCH_DEPTHS = [2, 3, 4];
const GRAVEL_DEPTHS = [2, 3, 4, 6];

type Amount = NonNullable<AnswerPage["amount"]>;

function amountOf(answer: AnswerPage): Amount {
  return answer.amount ?? { value: 1, unit: "yd" };
}

function rowValue(run: Computed | null, label: RegExp) {
  return run ? run.fmt(run.row(label)) : "—";
}

/** Inputs for this amount at a given depth and material. */
function gravelInputs(amount: Amount, depth: number, material = "100") {
  return amount.unit === "ton"
    ? gravelForTons(amount.value, depth, material)
    : gravelForYards(amount.value, depth, material);
}

/* ------------------------------------------------------- answer line -- */

/** The one sentence at the top, assembled from computed values. */
export function volumeAnswerLine(answer: AnswerPage, computed: Computed): ReactNode {
  const amount = amountOf(answer);
  const label = amountLabel(amount);

  if (answer.planner === "mulch-calculator") {
    return (
      <>
        {label} of mulch is{" "}
        <strong className="font-semibold">{rowValue(computed, /equivalent bags/i)}</strong> at the
        common 2 cu ft size. Spread 3 inches deep, it covers {rowValue(computed, /bed area/i)}.
      </>
    );
  }

  if (amount.unit === "ton") {
    return (
      <>
        {label} of crushed stone is about{" "}
        <strong className="font-semibold">{rowValue(computed, /^volume/i)}</strong> and covers{" "}
        {rowValue(computed, /^area/i)} at 4 inches deep.
      </>
    );
  }

  return (
    <>
      {label} of crushed stone weighs about{" "}
      <strong className="font-semibold">{rowValue(computed, /approximate weight/i)}</strong> and
      covers {rowValue(computed, /^area/i)} at 4 inches deep.
    </>
  );
}

/* ------------------------------------------------------------- body -- */

export function VolumeAnswer({ answer, computed }: { answer: AnswerPage; computed: Computed }) {
  return answer.planner === "mulch-calculator" ? (
    <MulchVolume answer={answer} computed={computed} />
  ) : (
    <GravelVolume answer={answer} computed={computed} />
  );
}

function MulchVolume({ answer, computed }: { answer: AnswerPage; computed: Computed }) {
  const amount = amountOf(answer);

  const bags = MULCH_BAGS.map((size) => ({
    size,
    count: rowValue(compute(answer.planner, mulchForYards(amount.value, 3, size)), /equivalent bags/i),
  }));

  const depths = MULCH_DEPTHS.map((depth) => ({
    depth,
    covers: rowValue(compute(answer.planner, mulchForYards(amount.value, depth)), /bed area/i),
  }));

  const bulk = computed.result.scenarios.find((scenario) => /bulk/i.test(scenario.name));
  const bagged = computed.result.scenarios.find((scenario) => /bag/i.test(scenario.name));

  return (
    <>
      <section aria-labelledby="answer-heading">
        <h2 id="answer-heading" className="sr-only">
          The answer
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {bags.map((row) => (
            <BigNumber
              key={row.size}
              tone={row.size === 2 ? "brand" : "plain"}
              label={`${row.size} cu ft bags`}
              value={row.count}
              note={row.size === 2 ? "The most common bag" : undefined}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="spread-heading">
        <h2 id="spread-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          How far it spreads
        </h2>
        <DepthStrip
          rows={depths.map((row) => ({
            depth: row.depth,
            value: row.covers,
            highlight: row.depth === 3,
          }))}
          caption={`Ground ${amountLabel(amount)} of mulch covers at each depth`}
        />
        <p className="pk-prose mt-3 text-sm">
          Two inches tops up an existing bed. Three is the usual for weed control. Four suits a new
          bed on bare soil.
        </p>
      </section>

      {bulk && bagged ? (
        <section aria-labelledby="cost-heading">
          <h2 id="cost-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Bulk or bags
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BigNumber
              tone={bulk.recommended ? "brand" : "plain"}
              label="Bulk, delivered"
              value={computed.money(bulk.totalCost)}
              note={bulk.recommended ? "Cheaper for this amount" : "Not worth a delivery this small"}
            />
            <BigNumber
              tone={bagged.recommended ? "brand" : "plain"}
              label="Bagged, 2 cu ft"
              value={computed.money(bagged.totalCost)}
              note={bagged.recommended ? "The practical choice here" : "No pile on the driveway"}
            />
          </div>
          <p className="mt-3 text-xs text-ink-subtle">
            Planning prices, editable in the planner. Excludes delivery fees and tax.
          </p>
        </section>
      ) : null}
    </>
  );
}

function GravelVolume({ answer, computed }: { answer: AnswerPage; computed: Computed }) {
  const amount = amountOf(answer);
  const byTon = amount.unit === "ton";

  const stones = GRAVEL_MATERIALS.map((material) => {
    const run = compute(answer.planner, gravelInputs(amount, 4, material.key));
    return {
      ...material,
      figure: byTon ? rowValue(run, /^volume/i) : rowValue(run, /approximate weight/i),
      covers: rowValue(run, /^area/i),
    };
  });

  const depths = GRAVEL_DEPTHS.map((depth) => ({
    depth,
    value: rowValue(compute(answer.planner, gravelInputs(amount, depth)), /^area/i),
    highlight: depth === 4,
  }));

  const byYard = computed.result.scenarios.find((scenario) => /yard/i.test(scenario.name));
  const byWeight = computed.result.scenarios.find((scenario) => /ton/i.test(scenario.name));

  return (
    <>
      <section aria-labelledby="answer-heading">
        <h2 id="answer-heading" className="sr-only">
          The answer
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {byTon ? (
            <BigNumber label="Volume" value={rowValue(computed, /^volume/i)} note="Crushed stone" />
          ) : (
            <BigNumber
              label="Weight"
              value={rowValue(computed, /approximate weight/i)}
              note="Crushed stone"
            />
          )}
          <BigNumber
            tone="plain"
            label="Covers"
            value={rowValue(computed, /^area/i)}
            note="At 4 inches deep"
          />
          <BigNumber
            tone="plain"
            label="Costs about"
            value={computed.money(
              Math.min(byYard?.totalCost ?? Infinity, byWeight?.totalCost ?? Infinity),
            )}
            note="Material, at planning prices"
          />
        </div>
      </section>

      <section aria-labelledby="stone-heading">
        <h2 id="stone-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {byTon ? "Yards by stone" : "Weight by stone"}
        </h2>
        <div
          className="mt-4 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={`${amountLabel(amount)} of gravel by type of stone`}
        >
          <table className="w-full min-w-[22rem] border-collapse text-sm">
            <caption className="sr-only">
              {amountLabel(amount)} of gravel for five common stones
            </caption>
            <thead>
              <tr className="border-b border-line-strong text-left">
                {(byTon ? ["Stone", "Volume", "Covers at 4 in"] : ["Stone", "Weight"]).map((heading) => (
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
              {stones.map((row, index) => (
                <tr
                  key={row.key}
                  className={`border-b border-line last:border-0 ${index === 0 ? "bg-brand-soft/45" : ""}`}
                >
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink">
                    {row.name}
                  </th>
                  <td className="py-2.5 pr-3 font-medium tabular-nums text-ink">{row.figure}</td>
                  {byTon ? (
                    <td className="py-2.5 tabular-nums text-ink-muted">{row.covers}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="spread-heading">
        <h2 id="spread-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          How far it spreads
        </h2>
        <DepthStrip rows={depths} caption={`Ground ${amountLabel(amount)} of crushed stone covers`} />
        <p className="pk-prose mt-3 text-sm">
          Two inches dresses a path. Four is the usual for a patio or shed base. Six is for a
          driveway that takes a car.
        </p>
      </section>

      {byYard && byWeight ? (
        <section aria-labelledby="cost-heading">
          <h2 id="cost-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            By the yard or by the ton
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BigNumber
              tone={byYard.recommended ? "brand" : "plain"}
              label="Priced by the yard"
              value={computed.money(byYard.totalCost)}
              note={byYard.recommended ? "Cheaper at these prices" : undefined}
            />
            <BigNumber
              tone={byWeight.recommended ? "brand" : "plain"}
              label="Priced by the ton"
              value={computed.money(byWeight.totalCost)}
              note={byWeight.recommended ? "Cheaper at these prices" : undefined}
            />
          </div>
          <p className="mt-3 text-xs text-ink-subtle">
            Suppliers quote one or the other. Planning prices, editable in the planner. Excludes
            delivery and tax.
          </p>
        </section>
      ) : null}
    </>
  );
}

/** A row of depth tiles: one glance shows how the same amount thins out. */
function DepthStrip({
  rows,
  caption,
}: {
  rows: { depth: number; value: string; highlight: boolean }[];
  caption: string;
}) {
  return (
    <ul
      aria-label={caption}
      className={`mt-4 grid grid-cols-2 gap-2 ${rows.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
    >
      {rows.map((row) => (
        <li
          key={row.depth}
          className={`rounded-[var(--radius-card)] border p-3 text-center ${
            row.highlight ? "border-brand/30 bg-brand-soft" : "border-line bg-surface"
          }`}
        >
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle">
            {row.depth} in deep
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums text-ink sm:text-lg">{row.value}</p>
        </li>
      ))}
    </ul>
  );
}
