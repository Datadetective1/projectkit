import { ClipboardList, Hammer, Lightbulb, Ruler, ShoppingCart } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Describe → Measure → Calculate → Buy → Build.
 *
 * The five words the whole product is organised around, stated once, as a
 * measured drawing. This replaced three identical "How it works" cards — which
 * said the same thing but looked like every other three-card feature row, and
 * so read as boilerplate to be skipped.
 *
 * Compare is the sixth step in the story and deliberately not a sixth tick
 * here: it is the section immediately below, where the ready-mix-versus-bags
 * figures make the argument far better than a word in a row of five could.
 *
 * Drawn as a dimension line with the stages ticked along it, because that is
 * the site's motif and because the sequence genuinely is a progression: the
 * rule connects them, the cards did not.
 *
 * Everything is CSS and inline SVG. The connecting rule draws itself once when
 * the strip scrolls into view; each stage follows it in.
 */

/**
 * Five words and five fragments.
 *
 * They were full sentences, which is one sentence more than a stage in a
 * five-across strip can hold before it stops being scannable — the whole point
 * of this section is that you get the shape of the product without reading it.
 * The label carries the meaning; the fragment underneath only has to stop the
 * label being ambiguous.
 */
const STAGES = [
  { icon: Lightbulb, label: "Describe", body: "A sentence, or pick a planner." },
  { icon: Ruler, label: "Measure", body: "Dimensions you can take with a tape." },
  { icon: ClipboardList, label: "Calculate", body: "Waste and purchase rounding applied." },
  { icon: ShoppingCart, label: "Buy", body: "A costed list, including what people forget." },
  { icon: Hammer, label: "Build", body: "The order to work through." },
];

/**
 * The rule draws across the strip, and each stage arrives as the line reaches
 * it — so the sequence is legible as a sequence rather than as five things
 * fading in near each other. These delays are the line's arrival times at each
 * stage, which is why they are spaced by the draw duration and not by taste.
 */
const LINE_DELAY = 120;
const LINE_MS = 900;
const stageDelay = (index: number) => LINE_DELAY + (LINE_MS / (STAGES.length - 1)) * index * 0.9;

export function ProcessStrip() {
  return (
    <section
      aria-labelledby="process-heading"
      className="relative overflow-hidden border-y border-line bg-paper-tint"
    >
      {/*
        The ruled grid is its own layer, not a class on the content wrapper.
        `mask-image` applies to an element's whole rendered subtree, so putting
        the fade on the container faded the *text* out towards the edges — which
        is exactly what "washed out" looked like before this was caught.
      */}
      <div className="pk-rule-grid pk-rule-fade absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <Reveal>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-brand">
              The whole idea
            </p>
            <h2
              id="process-heading"
              className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            >
              From a sentence to a shopping list, in about a minute
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <ol className="relative mt-10 grid gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
              {/*
                The rule the stages hang from. Desktop only: on a phone the
                stages stack, and a horizontal line through them would be a
                line to nowhere.
              */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 top-[1.375rem] hidden lg:block"
              >
                <svg
                  width="100%"
                  height="2"
                  viewBox="0 0 1000 2"
                  preserveAspectRatio="none"
                  className="block text-brand"
                >
                  <line
                    className="pk-draw"
                    style={{ "--pk-draw-length": 1000, "--pk-delay": `${LINE_DELAY}ms` } as React.CSSProperties}
                    x1="0"
                    y1="1"
                    x2="1000"
                    y2="1"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.28"
                  />
                </svg>
              </span>

              {STAGES.map((stage, index) => (
                <li
                  key={stage.label}
                  className="pk-stagger-item relative"
                  style={{ "--pk-delay": `${Math.round(stageDelay(index))}ms` } as React.CSSProperties}
                >
                  <span className="relative grid h-11 w-11 place-items-center rounded-xl border border-brand/20 bg-surface text-brand shadow-sm">
                    <stage.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-3.5 flex items-baseline gap-2 text-base font-semibold text-ink">
                    <span className="font-mono text-xs text-ink-subtle">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {stage.label}
                  </h3>
                  <p className="pk-prose mt-1 text-sm">{stage.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
