import { formatQuantity, roundTo } from "@/lib/units";
import {
  costOf,
  cubicFeetToYards,
  inchesToFeet,
  num,
  packagesNeeded,
  shoppingItem,
  str,
  sumCost,
  wasteMultiplier,
} from "@/lib/calc/helpers";
import { planningDefaults, prices } from "@/lib/pricing";
import type { CalculationContext, CalculationResult, MaterialLine } from "@/types/project";

/**
 * Fence layout, posts, rails, pickets, and post-hole concrete.
 * Everything here is a material-planning estimate: post depth, spacing, and
 * footing size are governed by local code and soil, not by arithmetic.
 */
export function calculateFence({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const layout = str(values, "layout", "rectangle");
  const length = num(values, "length");
  const width = num(values, "width");
  const runLength = num(values, "runLength");
  const height = num(values, "height", 6);
  const postSpacing = num(values, "postSpacing", 8);
  const gateCount = num(values, "gateCount", 1);
  const gateWidth = num(values, "gateWidth", 4);
  const railsPerSection = num(values, "railsPerSection", 3);
  const picketWidth = num(values, "picketWidth", 5.5);
  const picketGap = num(values, "picketGap", 0);
  const wastePct = num(values, "waste", planningDefaults.wasteFence);
  const postDepth = num(values, "postDepth", 24);
  const holeDiameter = num(values, "holeDiameter", 10);

  const postPrice = num(values, "postPrice", prices.fencePostEach);
  const railPrice = num(values, "railPrice", prices.fenceRailEach);
  const picketPrice = num(values, "picketPrice", prices.fencePicketEach);
  const gateHardwarePrice = num(values, "gateHardwarePrice", prices.fenceGateHardwareSet);
  const bagPrice = num(values, "bagPrice", prices.concreteBag60lb);

  const isEnclosed = layout === "rectangle";
  const totalLinearFt =
    layout === "rectangle" ? 2 * (length + width) : runLength;

  const gateAllowance = Math.min(gateCount * gateWidth, totalLinearFt);
  const fencedLinearFt = Math.max(totalLinearFt - gateAllowance, 0);

  const sections = fencedLinearFt > 0 ? Math.ceil(fencedLinearFt / postSpacing) : 0;
  // A closed loop needs one post per section; an open run needs one more.
  const linePosts = sections === 0 ? 0 : isEnclosed ? sections : sections + 1;
  const gatePosts = gateCount * 2;
  // Gate posts double as line posts where a gate interrupts the run.
  const totalPosts = Math.max(linePosts + gatePosts - (isEnclosed ? gateCount : 0), 0);

  const rails = sections * railsPerSection;
  const railLinearFt = roundTo(rails * postSpacing, 1);

  const picketPitch = picketWidth + picketGap;
  const pickets =
    picketPitch > 0
      ? Math.ceil((fencedLinearFt * 12 * wasteMultiplier(wastePct)) / picketPitch)
      : 0;

  // Post-hole concrete: hole volume less the post it swallows.
  const holeRadiusFt = inchesToFeet(holeDiameter) / 2;
  const holeVolumeCuFt = Math.PI * holeRadiusFt * holeRadiusFt * inchesToFeet(postDepth);
  const postVolumeCuFt = inchesToFeet(3.5) * inchesToFeet(3.5) * inchesToFeet(postDepth);
  const concretePerPost = Math.max(holeVolumeCuFt - postVolumeCuFt, 0);
  const concreteCuFt = concretePerPost * totalPosts;
  const concreteBags = packagesNeeded(concreteCuFt, 0.45);
  const concreteYards = cubicFeetToYards(concreteCuFt);

  const screws = Math.ceil(pickets * Math.max(railsPerSection, 1) * 2 * 1.1);
  // Screws are sold by weight, so the shopping list needs boxes, not pieces.
  const screwBoxes = Math.max(1, packagesNeeded(screws, planningDefaults.exteriorScrewsPerBox));

  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });

  const materials: MaterialLine[] = [
    {
      id: "posts",
      name: `Fence posts (${roundTo(height + inchesToFeet(postDepth), 1)} ft minimum length)`,
      quantity: totalPosts,
      measure: "count",
      unitOverride: "posts",
      unitPrice: postPrice,
      unitPriceLabel: "each",
      cost: costOf(totalPosts, postPrice),
      searchTerm: "fence posts",
      note: `${linePosts} line ${linePosts === 1 ? "post" : "posts"} plus ${gatePosts} gate ${gatePosts === 1 ? "post" : "posts"}.`,
    },
    {
      id: "rails",
      name: `Rails (${roundTo(postSpacing, 1)} ft)`,
      quantity: rails,
      measure: "count",
      unitOverride: "rails",
      unitPrice: railPrice,
      unitPriceLabel: "each",
      cost: costOf(rails, railPrice),
      searchTerm: "fence rails",
      note: `${roundTo(railsPerSection, 0)} per section, ${fmt(railLinearFt, "length", 1)} total.`,
    },
    {
      id: "pickets",
      name: `Pickets (${roundTo(picketWidth, 2)} in wide)`,
      quantity: pickets,
      measure: "count",
      unitOverride: "pickets",
      unitPrice: picketPrice,
      unitPriceLabel: "each",
      cost: costOf(pickets, picketPrice),
      searchTerm: "fence pickets",
      note: `Includes ${roundTo(wastePct, 1)}% waste and a ${roundTo(picketGap, 2)} in gap.`,
    },
    {
      id: "post-concrete",
      name: "Concrete mix for post holes",
      quantity: concreteBags,
      measure: "count",
      unitOverride: "bags",
      unitPrice: bagPrice,
      unitPriceLabel: "per 60 lb bag",
      cost: costOf(concreteBags, bagPrice),
      searchTerm: "fast setting concrete mix",
      isEstimate: true,
      note: `${fmt(concreteCuFt, "volumeFt", 2)} total. Hole size and depth vary by frost depth and soil.`,
    },
    ...(gateCount > 0
      ? [
          {
            id: "gate-hardware",
            name: "Gate hardware sets (hinges + latch)",
            quantity: gateCount,
            measure: "count" as const,
            unitOverride: gateCount === 1 ? "set" : "sets",
            unitPrice: gateHardwarePrice,
            unitPriceLabel: "per set",
            cost: costOf(gateCount, gateHardwarePrice),
            searchTerm: "fence gate hardware kit",
          },
        ]
      : []),
    {
      id: "screws",
      name: "Exterior screws / fasteners",
      quantity: screwBoxes,
      measure: "count",
      unitOverride: "boxes (5 lb)",
      isEstimate: true,
      searchTerm: "exterior deck screws",
      note: `About ${screws.toLocaleString("en-US")} screws — two per picket per rail plus 10%.`,
    },
  ];

  const costTotal = sumCost(materials);
  return {
    headline: {
      label: "You need approximately",
      value: totalPosts,
      measure: "count",
      unitOverride: totalPosts === 1 ? "post" : "posts",
      sublabel: `${fmt(totalLinearFt, "length", 1)} of fence in ${sections} ${sections === 1 ? "section" : "sections"}`,
    },
    summary: [
      { label: "Total fence line", value: totalLinearFt, measure: "length", precision: 1 },
      { label: "Gate openings", value: gateAllowance, measure: "length", precision: 1 },
      { label: "Fenced run", value: fencedLinearFt, measure: "length", precision: 1 },
      { label: "Sections", value: sections, measure: "count", unitOverride: "sections" },
      {
        label: "Posts",
        value: totalPosts,
        measure: "count",
        unitOverride: "posts",
        emphasis: true,
      },
      { label: "Fence height", value: height, measure: "length", precision: 1 },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "spacing-6",
        name: "6 ft post spacing",
        summary: "Stiffer fence, more posts, more concrete.",
        recommended: postSpacing <= 6,
        rows: [
          {
            label: "Posts",
            value: fencedLinearFt > 0 ? Math.ceil(fencedLinearFt / 6) + (isEnclosed ? 0 : 1) + gatePosts : 0,
            measure: "count",
            unitOverride: "posts",
          },
        ],
      },
      {
        id: "spacing-8",
        name: "8 ft post spacing",
        summary: "The common default for residential privacy fence.",
        recommended: postSpacing > 6,
        rows: [
          {
            label: "Posts",
            value: fencedLinearFt > 0 ? Math.ceil(fencedLinearFt / 8) + (isEnclosed ? 0 : 1) + gatePosts : 0,
            measure: "count",
            unitOverride: "posts",
          },
        ],
      },
    ],
    explanation: [
      `Your fence line runs ${fmt(totalLinearFt, "length", 1)}. Taking out ${roundTo(gateCount, 0)} gate ${gateCount === 1 ? "opening" : "openings"} leaves ${fmt(fencedLinearFt, "length", 1)} of actual fence, which divides into ${sections} ${sections === 1 ? "section" : "sections"} at ${roundTo(postSpacing, 1)} ft spacing.`,
      `Posts are the part you cannot fudge — each one needs a hole roughly ${roundTo(holeDiameter, 0)} in across and ${roundTo(postDepth, 0)} in deep, which is where the ${concreteBags} bags of concrete go.`,
      `Picket count assumes ${roundTo(picketWidth, 2)} in boards with a ${roundTo(picketGap, 2)} in gap. Shrinkage after installation is normal with wet lumber.`,
    ],
    formulas: [
      {
        kind: "math",
        label: "Fence line",
        expression: isEnclosed ? "2 × (Length + Width)" : "Total run length",
      },
      { kind: "math", label: "Sections", expression: "⌈Fenced run ÷ Post spacing⌉" },
      {
        kind: "math",
        label: "Posts",
        expression: isEnclosed ? "Sections + gate posts" : "Sections + 1 + gate posts",
      },
      {
        kind: "math",
        label: "Pickets",
        expression: "⌈(Fenced run × 12 × waste) ÷ (Picket width + gap)⌉",
      },
      {
        kind: "assumption",
        label: "Post hole concrete",
        expression: "π × (Hole diameter ÷ 2)² × Depth, less post volume",
      },
    ],
    assumptions: [
      { label: "Post spacing", value: `${roundTo(postSpacing, 1)} ft on centre` },
      { label: "Post hole", value: `${roundTo(holeDiameter, 0)} in wide × ${roundTo(postDepth, 0)} in deep` },
      { label: "Rails per section", value: `${roundTo(railsPerSection, 0)}` },
      { label: "Picket spacing", value: `${roundTo(picketWidth, 2)} in wide, ${roundTo(picketGap, 2)} in gap` },
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
      { label: "Post concrete", value: `${roundTo(concreteYards, 2)} yd³ total` },
    ],
    shoppingExtras: [
      shoppingItem("string-line", "String line and marking paint"),
      shoppingItem("post-level", "Post level"),
      shoppingItem("digger", "Post hole digger or auger rental"),
      shoppingItem("gravel", "Gravel for the bottom of each post hole"),
      shoppingItem("stain", "Stain or sealer", undefined, true),
      shoppingItem("caps", "Post caps", undefined, true),
    ],
    warnings: [
      "Call for utility locates before digging any post hole.",
      "Fence height, setback, and material are frequently restricted by local ordinance or an HOA. Confirm before buying.",
      "Post depth and footing size depend on frost depth, soil, and wind exposure in your area.",
    ],
    effort: {
      difficulty: "Moderate",
      timeCategory: totalPosts > 20 ? "Two to three weekends" : "A weekend",
      notes: [
        "Digging holes is the slow part — an auger rental changes the day completely.",
        "Set and brace all posts first, let the concrete cure, then hang rails and pickets.",
      ],
    },
  };
}
