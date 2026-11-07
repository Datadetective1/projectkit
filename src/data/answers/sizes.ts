import type { AnswerPage } from "@/types/answer";
import { amountLabel, gravelForTons, gravelForYards, mulchForYards } from "@/lib/answers/volume";

/**
 * Answer pages for the exact sizes people search.
 *
 * Search Console shows the long tail of these questions arriving with a number
 * in them ("3 yards of mulch", "10 tons of gravel", "24x30 slab"), and no page
 * on the site answering that number. These definitions are generated from the
 * size lists below, and the same rule as the hand-written pages holds: the
 * definition sets the question and the framing, never an answer. Every figure
 * on the page is computed by the planner at render time.
 *
 * Framing varies by size band, so a 1-yard page and a 20-yard page talk about
 * genuinely different jobs rather than swapping a number into one paragraph.
 */

/* --------------------------------------------------------------- lists -- */

/** Sizes that appear in Search Console queries, plus the round numbers between them. */
const MULCH_YARDS = [1, 2, 3, 4, 5, 8, 10, 20];
const GRAVEL_YARDS = [1, 1.5, 2, 3, 4, 5, 7, 10, 20];
const GRAVEL_TONS = [4, 5, 10, 12, 15, 20];
/** Slabs beyond the two hand-written ones (10 × 10 and 20 × 20). */
const SLABS: [number, number][] = [
  [12, 12],
  [10, 20],
  [12, 20],
  [16, 20],
  [20, 24],
  [24, 24],
  [24, 30],
  [30, 30],
];
/** Lawn areas beyond the hand-written 1,000 sq ft page, each as a rectangle. */
const LAWNS: [number, number][] = [
  [25, 20],
  [50, 30],
  [50, 40],
  [60, 50],
  [100, 50],
];

/** "3 Yards", "10 Tons", for titles. */
function titleAmount(value: number, unit: "yd" | "ton") {
  return amountLabel({ value, unit }).replace(/ (y|t)/, (match) => match.toUpperCase());
}

function slug(value: number) {
  return String(value).replace(".", "-");
}

function neighbors<T>(list: T[], index: number) {
  return [list[index - 1], list[index + 1]].filter((entry): entry is T => entry !== undefined);
}

/* --------------------------------------------------------------- mulch -- */

function mulchIntro(yards: number) {
  const label = amountLabel({ value: yards, unit: "yd" });
  if (yards <= 1)
    return `${label} of mulch is a small job: a couple of beds by the door or rings around a few trees. It sits right at the point where bulk delivery stops being worth it, so the bag count matters here.`;
  if (yards <= 3)
    return `${label} of mulch is a typical front yard refresh. Big enough that bulk usually wins on price, small enough that bags are still a sensible weekend.`;
  if (yards <= 5)
    return `${label} of mulch is a full yard of beds. At this size bags mean a car full of trips, which is why most people take a delivery.`;
  return `${label} of mulch is a landscaping job, not an afternoon. Nobody buys this in bags, so the useful questions are how far it spreads and what the pile will cost.`;
}

const mulchPages: AnswerPage[] = MULCH_YARDS.map((yards, index) => {
  const label = amountLabel({ value: yards, unit: "yd" });
  const values = mulchForYards(yards);
  return {
    slug: `${slug(yards)}-yards`,
    planner: "mulch-calculator",
    kind: "volume",
    group: "By the yard",
    amount: { value: yards, unit: "yd" },
    h1: `How many bags of mulch is ${label}?`,
    seo: {
      title: `How Many Bags Is ${titleAmount(yards, "yd")} of Mulch?`,
      description: `${label} of mulch in bags at every common size, how far it spreads at 2, 3 and 4 inches deep, and bulk delivery against bags on price.`,
      breadcrumb: label,
    },
    intro: mulchIntro(yards),
    values,
    prefill: { shape: values.shape as string, area: values.area as number, depth: values.depth as number },
    faq: [
      {
        question: `How many square feet does ${label} of mulch cover?`,
        answer: `It depends on depth, which is why the page shows three. The same ${label} covers half as much ground at four inches as it does at two, so pick the depth first and the coverage follows.`,
      },
      {
        question: "Is bulk mulch cheaper than bags?",
        answer:
          "Almost always per yard, because bags are priced for carrying. Below about one cubic yard the delivery is not worth arranging, and the planner recommends bags for that reason rather than price.",
      },
    ],
    related: [
      ...neighbors(MULCH_YARDS, index).map((other) => ({
        href: `/mulch-calculator/${slug(other)}-yards`,
        label: `How many bags is ${amountLabel({ value: other, unit: "yd" })} of mulch?`,
        note: other > yards ? "The next size up" : "The next size down",
      })),
      {
        href: "/mulch-calculator/bags-per-cubic-yard",
        label: "How many bags of mulch are in a cubic yard?",
        note: "The conversion behind every page here",
      },
    ],
  };
});

/* -------------------------------------------------------------- gravel -- */

function gravelYardIntro(yards: number) {
  const label = amountLabel({ value: yards, unit: "yd" });
  if (yards <= 2)
    return `${label} of gravel is a path, a shed base or a drainage trench. Suppliers quote it by the yard or by the ton, and the stone you pick changes the weight more than people expect.`;
  if (yards <= 5)
    return `${label} of gravel is a patio base or a short parking pad. At this size the weight decides whether one truck can bring it, so it helps to know the tons before calling.`;
  return `${label} of gravel is driveway territory. The weight runs into several truckloads at some suppliers, and the depth you spread it at decides how far it goes.`;
}

const gravelYardPages: AnswerPage[] = GRAVEL_YARDS.map((yards, index) => {
  const label = amountLabel({ value: yards, unit: "yd" });
  const values = gravelForYards(yards);
  return {
    slug: `${slug(yards)}-yards`,
    planner: "gravel-calculator",
    kind: "volume",
    group: "By the yard",
    amount: { value: yards, unit: "yd" },
    h1: `How many tons is ${label} of gravel?`,
    seo: {
      title: `${titleAmount(yards, "yd")} of Gravel: Tons, Coverage and Cost`,
      description: `${label} of gravel in tons for five common stones, how much ground it covers from 2 to 6 inches deep, and the cost by the yard or the ton.`,
      breadcrumb: label,
    },
    intro: gravelYardIntro(yards),
    values,
    prefill: {
      length: values.length as number,
      width: values.width as number,
      depth: values.depth as number,
      material: values.material as string,
    },
    faq: [
      {
        question: `How much does ${label} of gravel weigh?`,
        answer:
          "It depends on the stone. Crushed stone, pea gravel and crusher run all pack differently, so the same yard can weigh noticeably more or less. The table above runs each one through the planner.",
      },
      {
        question: "Should I buy gravel by the yard or by the ton?",
        answer:
          "Whichever your supplier quotes, but compare like with like. The page prices both from the same order, so you can tell whether a per-ton quote is really cheaper than a per-yard one.",
      },
    ],
    related: [
      ...neighbors(GRAVEL_YARDS, index).map((other) => ({
        href: `/gravel-calculator/${slug(other)}-yards`,
        label: `How many tons is ${amountLabel({ value: other, unit: "yd" })} of gravel?`,
        note: other > yards ? "The next size up" : "The next size down",
      })),
      {
        href: "/gravel-calculator/10-tons",
        label: "How many yards is 10 tons of gravel?",
        note: "The same question from the other side",
      },
    ],
  };
});

function gravelTonIntro(tons: number) {
  const label = amountLabel({ value: tons, unit: "ton" });
  if (tons <= 5)
    return `${label} of gravel is a common minimum load. Quarries sell by weight, but you spread by area, so the useful number is how far ${label} goes.`;
  if (tons <= 12)
    return `${label} of gravel is a single dump truck load at many quarries. That is usually enough for a short driveway or a large patio base, depending on depth.`;
  return `${label} of gravel is a big order, often more than one truck. Knowing the yards and the coverage first is how you avoid a second delivery fee.`;
}

const gravelTonPages: AnswerPage[] = GRAVEL_TONS.map((tons, index) => {
  const label = amountLabel({ value: tons, unit: "ton" });
  const values = gravelForTons(tons);
  return {
    slug: `${slug(tons)}-tons`,
    planner: "gravel-calculator",
    kind: "volume",
    group: "By the ton",
    amount: { value: tons, unit: "ton" },
    h1: `How many yards is ${label} of gravel, and what does it cover?`,
    seo: {
      title: `${titleAmount(tons, "ton")} of Gravel: Yards, Coverage and Cost`,
      description: `${label} of gravel in cubic yards for five common stones, how much ground it covers from 2 to 6 inches deep, and the cost by the ton or the yard.`,
      breadcrumb: label,
    },
    intro: gravelTonIntro(tons),
    values,
    prefill: {
      length: values.length as number,
      width: values.width as number,
      depth: values.depth as number,
      material: values.material as string,
    },
    faq: [
      {
        question: `How much area does ${label} of gravel cover?`,
        answer:
          "Depth decides it. The strip above shows the same load at two, three, four and six inches, and the coverage drops in step as the layer gets thicker. Four inches is the usual for a base.",
      },
      {
        question: "Why does the stone type change the yards?",
        answer:
          "A ton is a weight, and denser stone takes up less room per ton. Crusher run packs tighter than pea gravel, so the same tonnage fills fewer yards. The table runs each stone separately.",
      },
    ],
    related: [
      ...neighbors(GRAVEL_TONS, index).map((other) => ({
        href: `/gravel-calculator/${slug(other)}-tons`,
        label: `How many yards is ${amountLabel({ value: other, unit: "ton" })} of gravel?`,
        note: other > tons ? "The next size up" : "The next size down",
      })),
      {
        href: "/gravel-calculator/3-yards",
        label: "How many tons is 3 yards of gravel?",
        note: "The same question from the other side",
      },
    ],
  };
});

/* ------------------------------------------------------------ concrete -- */

function slabIntro(length: number, width: number) {
  const area = length * width;
  const name = `A ${length} × ${width} slab`;
  if (area <= 150)
    return `${name} is a shed base, a hot tub pad or a landing outside a door. Small enough to pour in an afternoon, and close enough to the delivery threshold that bags are worth pricing.`;
  if (area <= 400)
    return `${name} is a patio or a single parking pad. Past the point where bags make sense, so the useful numbers are the yards to order and what the base under it costs.`;
  return `${name} is a garage floor or a full driveway pad. At this size the concrete is one line among several: base gravel, mesh and forms all scale with it.`;
}

const slabPages: AnswerPage[] = SLABS.map(([length, width], index) => {
  const values = { length, width, thickness: 4 };
  const dims = `${length} × ${width}`;
  return {
    slug: `${length}x${width}-slab`,
    planner: "concrete-calculator",
    kind: "size",
    group: "Slab sizes",
    h1: `How much concrete do I need for a ${dims} slab?`,
    seo: {
      title: `How Much Concrete for a ${length}x${width} Slab?`,
      description: `A ${dims} ft slab at 4 inches: the raw volume, the volume with waste, and the yards to order, plus 5 and 6 inch slabs and ready-mix against bags.`,
      breadcrumb: `${dims} slab`,
    },
    intro: slabIntro(length, width),
    values,
    prefill: values,
    faq: [
      {
        question: `How thick should a ${dims} slab be?`,
        answer:
          "Four inches is standard for patios, walkways and shed bases. Go to five or six where a vehicle will park or a heavy structure will sit. The table above prices all three thicknesses.",
      },
      {
        question: "Why order more concrete than the slab volume?",
        answer:
          "Ground is never perfectly flat and forms bow a little, so a pour always takes more than the geometry says. Running short mid-pour leaves a cold joint, which is far worse than a little left over.",
      },
    ],
    related: [
      ...neighbors(SLABS, index).map(([otherLength, otherWidth]) => ({
        href: `/concrete-calculator/${otherLength}x${otherWidth}-slab`,
        label: `How much concrete for a ${otherLength} × ${otherWidth} slab?`,
        note: otherLength * otherWidth > length * width ? "The next size up" : "The next size down",
      })),
      {
        href: "/concrete-calculator/ready-mix-vs-bagged",
        label: "Ready-mix or bagged concrete?",
        note: "Where the recommendation flips, and why",
      },
    ],
  };
});

/* ----------------------------------------------------------------- sod -- */

const lawnPages: AnswerPage[] = LAWNS.map(([length, width], index) => {
  const area = length * width;
  const areaLabel = area.toLocaleString("en-US");
  const values = { length, width };
  return {
    slug: `${area}-square-feet`,
    planner: "sod-calculator",
    kind: "coverage",
    group: "Lawn sizes",
    h1: `How much sod do I need for ${areaLabel} square feet?`,
    seo: {
      title: `How Much Sod for ${areaLabel} Sq Ft? Rolls & Pallets`,
      description: `${areaLabel} square feet of lawn in rolls and pallets, with the allowance for cuts, and whether whole pallets or loose rolls cost less at this size.`,
      breadcrumb: `${areaLabel} sq ft`,
    },
    intro:
      area < 1000
        ? `${areaLabel} square feet is a small lawn or a patch repair. At this size a whole pallet can be far more than you need, so loose rolls are worth pricing.`
        : `${areaLabel} square feet is a full lawn, laid over a weekend with help. Sod lives only a day or two on the pallet, so order it for the day you lay it.`,
    values,
    prefill: values,
    faq: [
      {
        question: "How many square feet is a pallet of sod?",
        answer:
          "Cubitora assumes 450 square feet, shown as an adjustable assumption because it varies by farm and grass, commonly 400 to 500. Confirm it with your supplier before you order.",
      },
    ],
    related: [
      ...neighbors(LAWNS, index).map(([otherLength, otherWidth]) => {
        const other = otherLength * otherWidth;
        return {
          href: `/sod-calculator/${other}-square-feet`,
          label: `How much sod for ${other.toLocaleString("en-US")} square feet?`,
          note: other > area ? "The next size up" : "The next size down",
        };
      }),
      {
        href: "/sod-calculator/1000-square-feet",
        label: "How much sod for 1,000 square feet?",
        note: "Where the pallet decision is explained",
      },
    ],
  };
});

export const generatedAnswers: AnswerPage[] = [
  ...slabPages,
  ...mulchPages,
  ...gravelYardPages,
  ...gravelTonPages,
  ...lawnPages,
];
