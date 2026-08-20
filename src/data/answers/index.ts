import type { AnswerPage } from "@/types/answer";

/**
 * The answer pages, in full.
 *
 * Five to start, deliberately. The pattern scales to hundreds, which is exactly
 * why it is being proved on five first: if Google and Bing do not respond to
 * this shape of page, two hundred of them is two hundred liabilities.
 *
 * Note what is *not* in these definitions: quantities, prices, bag counts,
 * savings. Those all come from the engine at render time. What is here is the
 * question, the inputs, and the framing — the parts a machine cannot decide.
 */
const ANSWERS: AnswerPage[] = [
  /* ------------------------------------------------------- concrete -- */
  {
    slug: "10x10-slab",
    planner: "concrete-calculator",
    kind: "size",
    h1: "How much concrete do I need for a 10 × 10 slab?",
    seo: {
      title: "How Much Concrete for a 10x10 Slab? — Yards & Bags",
      description:
        "A 10 × 10 ft slab at 4 inches thick, worked out three ways: the raw volume, the volume with waste, and the quantity to actually order. Plus 5 in and 6 in.",
      breadcrumb: "10 × 10 slab",
    },
    intro:
      "A 10 × 10 slab is the most common small pour there is — a shed base, a hot-tub pad, a small patio. The arithmetic is simple; the part people get wrong is ordering, because the volume you calculate is never the volume you buy.",
    values: { length: 10, width: 10, thickness: 4 },
    prefill: { length: 10, width: 10, thickness: 4 },
    faq: [
      {
        question: "How thick should a 10 × 10 slab be?",
        answer:
          "Four inches is standard for a patio, shed base, or walkway. Go to five or six inches if vehicles will sit on it, or if the slab will carry a heavy structure. The table above shows all three thicknesses, because the difference between them is most of the order.",
      },
      {
        question: "Is it cheaper to use bags or ready-mix for a 10 × 10 slab?",
        answer:
          "Ready-mix material is cheaper per cubic yard at this size, and a 10 × 10 slab is above the point where a delivery is practical. Bags avoid scheduling a truck but mean mixing every one of them by hand. The comparison below prices both.",
      },
      {
        question: "Do I need gravel under a 10 × 10 slab?",
        answer:
          "The planner assumes a four-inch compacted gravel base and includes it in the materials, because a slab poured straight onto soil will crack as the ground moves. The base is a real cost and it is quoted alongside the concrete rather than hidden.",
      },
    ],
    related: [
      {
        href: "/concrete-calculator/20x20-slab",
        label: "How much concrete for a 20 × 20 slab?",
        note: "Four times the area, and past every delivery minimum",
      },
      {
        href: "/concrete-calculator/ready-mix-vs-bagged",
        label: "Ready-mix or bagged concrete?",
        note: "Where the recommendation flips, and why",
      },
    ],
  },

  {
    slug: "20x20-slab",
    planner: "concrete-calculator",
    kind: "size",
    h1: "How many yards of concrete for a 20 × 20 slab?",
    seo: {
      title: "How Many Yards of Concrete for a 20x20 Slab?",
      description:
        "A 20 × 20 ft slab at 4 inches, worked out three ways: raw volume, volume with waste, and the quantity to order. Includes base gravel, mesh and forms.",
      breadcrumb: "20 × 20 slab",
    },
    intro:
      "Four hundred square feet is a proper pour — a two-car parking pad, a large patio, a workshop floor. At this size the concrete stops being the only cost that matters: base gravel, mesh and forms are all real money, and all of them scale with the slab.",
    values: { length: 20, width: 20, thickness: 4 },
    prefill: { length: 20, width: 20, thickness: 4 },
    faq: [
      {
        question: "Can I pour a 20 × 20 slab myself?",
        answer:
          "The planner rates this size as challenging and budgets a full weekend with help. A pour this large has to be placed, screeded and finished before it sets, which is a crew job rather than a solo one — the concrete does not wait.",
      },
      {
        question: "How many bags of concrete would a 20 × 20 slab take?",
        answer:
          "Enough that nobody does it. The bagged figure is shown below for comparison, and at this volume it is both more expensive and an entire day of mixing before any finishing work starts.",
      },
      {
        question: "Should a 20 × 20 slab have control joints?",
        answer:
          "Yes. A slab this size needs joints cut so it cracks where you decide rather than where it wants to. Cubitora sizes materials and does not design jointing — spacing depends on thickness and mix, so check it against local practice or an engineer.",
      },
    ],
    related: [
      {
        href: "/concrete-calculator/10x10-slab",
        label: "How much concrete for a 10 × 10 slab?",
        note: "The small-pour case, where bags are still viable",
      },
      {
        href: "/concrete-calculator/ready-mix-vs-bagged",
        label: "Ready-mix or bagged concrete?",
        note: "At this size the answer is not close",
      },
    ],
  },

  {
    slug: "ready-mix-vs-bagged",
    planner: "concrete-calculator",
    kind: "comparison",
    h1: "Ready-mix or bagged concrete: which should you use?",
    seo: {
      title: "Ready-Mix vs Bagged Concrete — Which Is Cheaper?",
      description:
        "Both options priced across eight slab sizes, showing where the recommendation changes — and why it is about delivery minimums rather than material cost.",
      breadcrumb: "Ready-mix vs bagged",
    },
    intro:
      "Most pages answer this with a rule of thumb someone remembered. This one prices both options at every common slab size using the same calculation the planner runs, and shows exactly where the answer changes — and, more usefully, why.",
    values: { length: 20, width: 16, thickness: 4 },
    prefill: { length: 20, width: 16, thickness: 4 },
    faq: [
      {
        question: "Is bagged concrete ever cheaper than ready-mix?",
        answer:
          "Not on material. Ready-mix costs less per cubic yard at every size in the table above. Bagged wins below about a cubic yard for a different reason entirely: a supplier will not send a truck for that little, and the short-load fee to make them do it can cost more than the concrete.",
      },
      {
        question: "How many bags of concrete make a cubic yard?",
        answer:
          "At the 0.45 cubic feet an 80 lb bag yields, a cubic yard takes sixty of them. That is the number worth remembering before deciding to mix by hand — it is sixty bags to lift, open, mix and place before the first one starts setting.",
      },
      {
        question: "Does Cubitora include delivery in the ready-mix price?",
        answer:
          "No, and that matters here. The ready-mix figure is material only. Delivery, short-load fees and any waiting time are excluded, which is precisely why the recommendation switches to bags below a cubic yard even though the material is dearer.",
      },
    ],
    related: [
      {
        href: "/concrete-calculator/10x10-slab",
        label: "How much concrete for a 10 × 10 slab?",
        note: "Just past the delivery threshold",
      },
      {
        href: "/mulch-calculator/bags-per-cubic-yard",
        label: "Bags of mulch per cubic yard",
        note: "The same bulk-versus-packaged decision",
      },
    ],
  },

  /* ---------------------------------------------------------- mulch -- */
  {
    slug: "bags-per-cubic-yard",
    planner: "mulch-calculator",
    kind: "conversion",
    h1: "How many bags of mulch are in a cubic yard?",
    seo: {
      title: "How Many Bags of Mulch in a Cubic Yard?",
      description:
        "A cubic yard is 27 cubic feet, so the answer depends entirely on bag size: 13.5 bags at 2 cu ft, 18 at 1.5, 9 at 3. With what that means for a real bed.",
      breadcrumb: "Bags per cubic yard",
    },
    intro:
      "This looks like a single-number question and is not, because bags are not a standard size. A cubic yard is 27 cubic feet; how many bags that takes depends on which bag is in front of you.",
    values: { shape: "custom", area: 500, depth: 3 },
    prefill: { shape: "custom", area: 500, depth: 3 },
    faq: [
      {
        question: "Why do suppliers sell mulch by the cubic yard?",
        answer:
          "Because that is the unit a truck carries. Bagged mulch is priced for convenience and carrying; bulk is priced by volume delivered in a pile. The two only become comparable once you convert, which is what the table above is for.",
      },
      {
        question: "How deep should mulch be?",
        answer:
          "The planner assumes three inches, which suppresses weeds without suffocating roots. Two inches is enough for a top-up over existing mulch; four is for a new bed on bare soil. Depth changes the volume proportionally, so it changes the bag count by the same factor.",
      },
    ],
    related: [
      {
        href: "/mulch-calculator",
        label: "Mulch calculator",
        note: "Work out your own bed, at your own depth",
      },
      {
        href: "/concrete-calculator/ready-mix-vs-bagged",
        label: "Ready-mix vs bagged concrete",
        note: "Bulk against bags, priced the same way",
      },
    ],
  },

  /* ------------------------------------------------------------ sod -- */
  {
    slug: "1000-square-feet",
    planner: "sod-calculator",
    kind: "coverage",
    h1: "How much sod do I need for 1,000 square feet?",
    seo: {
      title: "How Much Sod for 1,000 Sq Ft? Rolls & Pallets",
      description:
        "1,000 sq ft of lawn in rolls and pallets, with the waste allowance for cuts, and why buying by the pallet can leave you paying for grass you do not need.",
      breadcrumb: "1,000 square feet",
    },
    intro:
      "Sod is bought two ways and the cheaper one depends on how close your area lands to a whole pallet. That is the part worth getting right before ordering — the offcuts are where the money goes.",
    values: { length: 50, width: 20 },
    prefill: { length: 50, width: 20 },
    faq: [
      {
        question: "How many square feet is a pallet of sod?",
        answer:
          "Cubitora assumes 450 square feet, and shows it as an adjustable assumption rather than a fact, because pallet coverage genuinely varies — commonly 400 to 500 square feet depending on the farm, the region and the grass. Confirm it with your supplier before ordering, then change it here if it differs.",
      },
      {
        question: "How much extra sod should I order?",
        answer:
          "The planner adds a five per cent allowance for cuts around beds, paths and corners. A rectangular lawn with straight edges wastes less than that; anything with curves wastes more.",
      },
      {
        question: "Should I buy sod by the pallet or by the square foot?",
        answer:
          "Whichever wastes less. Pallet pricing is usually lower per square foot, but you buy whole pallets — so an area that overshoots a pallet by a little pays for a lot of grass it will not lay. Both are priced above for exactly this reason.",
      },
    ],
    related: [
      {
        href: "/sod-calculator",
        label: "Sod calculator",
        note: "Your own lawn, including irregular areas",
      },
      {
        href: "/mulch-calculator/bags-per-cubic-yard",
        label: "Bags of mulch per cubic yard",
        note: "The other bulk-versus-packaged decision",
      },
    ],
  },
];

export const answerPages = ANSWERS;

export function getAnswer(planner: string, slug: string): AnswerPage | undefined {
  return ANSWERS.find((page) => page.planner === planner && page.slug === slug);
}

export function answersFor(planner: string): AnswerPage[] {
  return ANSWERS.filter((page) => page.planner === planner);
}

/** Every answer-page path, for the sitemap and llms.txt. */
export function answerPaths(): string[] {
  return ANSWERS.map((page) => `/${page.planner}/${page.slug}`);
}
