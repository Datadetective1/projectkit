import { formatQuantity, roundTo } from "@/lib/units";
import {
  bool,
  costOf,
  inchesToFeet,
  num,
  packagesNeeded,
  shoppingItem,
  sumCost,
  wasteMultiplier,
} from "@/lib/calc/helpers";
import { planningDefaults, prices } from "@/lib/pricing";
import type { CalculationContext, CalculationResult, MaterialLine } from "@/types/project";

/**
 * Deck material planning.
 *
 * Explicitly NOT structural design. Joist spans, beam sizes, post spacing,
 * footing depth, and ledger attachment are all engineering questions governed
 * by local code — this only estimates how much material a deck of these
 * dimensions consumes.
 */
export function calculateDeck({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const length = num(values, "length");
  const width = num(values, "width");
  const height = num(values, "height", 3);
  const boardWidth = Math.max(num(values, "boardWidth", 5.5), 0.5);
  const boardGap = num(values, "boardGap", 0.25);
  const joistSpacing = Math.max(num(values, "joistSpacing", 16), 4);
  const wastePct = num(values, "waste", planningDefaults.wasteDeck);
  const includeRailing = bool(values, "includeRailing", true);
  const includeStairs = bool(values, "includeStairs", true);
  const stairSteps = includeStairs ? Math.max(num(values, "stairSteps", 4), 1) : 0;
  const attachedSides = num(values, "attachedSides", 1);

  const deckingPrice = num(values, "deckingPrice", prices.deckingPerLinearFoot);
  const joistPrice = num(values, "joistPrice", prices.joistPerLinearFoot);
  const railingPrice = num(values, "railingPrice", prices.railingPerLinearFoot);

  const areaSqFt = length * width;

  // Decking runs across the width; each board covers (width + gap) of length.
  const boardPitchFt = inchesToFeet(boardWidth + boardGap);
  const rows = boardPitchFt > 0 ? Math.ceil(length / boardPitchFt) : 0;
  const deckingLinearFt = rows * width * wasteMultiplier(wastePct);

  // Joists run the width, spaced along the length.
  const joistCount = Math.floor(length / inchesToFeet(joistSpacing)) + 1;
  const joistLinearFt = joistCount * width;

  // Rim joists / ledger around the perimeter.
  const rimLinearFt = 2 * (length + width);

  /*
   * Beams, posts, and footings are deliberately NOT quantified.
   *
   * Their sizes and spacing come from joist span, lumber species and grade,
   * deck height, soil, frost depth, and local code — none of which this
   * planner knows. Printing "6 posts, 6 footings, 32 linear ft of beam" from a
   * formula like `length * 2` would put a number that looks engineered next to
   * a dollar figure, and a homeowner could reasonably build to it. They appear
   * on the shopping list as items to size from a real structural design.
   */

  const perimeter = 2 * (length + width);
  const railingLinearFt = includeRailing
    ? Math.max(perimeter - attachedSides * length, 0)
    : 0;

  const stairTreadLinearFt = includeStairs ? stairSteps * 3 * 2 : 0; // 3 ft wide, 2 boards deep
  const stringers = includeStairs ? 3 : 0;

  const screws = Math.ceil(areaSqFt * 3.5);
  // Screws are sold by weight, so the shopping list needs boxes, not pieces.
  const screwBoxes = Math.max(1, packagesNeeded(screws, planningDefaults.exteriorScrewsPerBox));
  const joistHangers = joistCount * 2;

  const materials: MaterialLine[] = [
    {
      id: "decking",
      name: `Decking boards (${roundTo(boardWidth, 2)} in wide)`,
      quantity: Math.ceil(deckingLinearFt),
      measure: "length",
      precision: 0,
      unitOverride: "linear ft",
      unitPrice: deckingPrice,
      unitPriceLabel: "per linear ft",
      cost: costOf(Math.ceil(deckingLinearFt), deckingPrice),
      searchTerm: "composite decking boards",
      note: `${rows} rows across ${roundTo(length, 1)} ft with a ${roundTo(boardGap, 3)} in gap, plus ${roundTo(wastePct, 1)}% waste.`,
    },
    {
      id: "joists",
      name: `Joists at ${roundTo(joistSpacing, 0)} in on centre`,
      quantity: Math.ceil(joistLinearFt),
      measure: "length",
      precision: 0,
      unitOverride: "linear ft",
      unitPrice: joistPrice,
      unitPriceLabel: "per linear ft",
      cost: costOf(Math.ceil(joistLinearFt), joistPrice),
      isEstimate: true,
      searchTerm: "pressure treated joist lumber",
      note: `About ${joistCount} joists spanning ${roundTo(width, 1)} ft. Joist size and span must be verified against code.`,
    },
    {
      id: "rim",
      name: "Rim joists / ledger",
      quantity: Math.ceil(rimLinearFt),
      measure: "length",
      precision: 0,
      unitOverride: "linear ft",
      unitPrice: joistPrice,
      unitPriceLabel: "per linear ft",
      cost: costOf(Math.ceil(rimLinearFt), joistPrice),
      isEstimate: true,
      searchTerm: "pressure treated lumber",
    },
    ...(includeRailing
      ? [
          {
            id: "railing",
            name: "Railing",
            quantity: Math.ceil(railingLinearFt),
            measure: "length" as const,
            precision: 0,
            unitOverride: "linear ft",
            unitPrice: railingPrice,
            unitPriceLabel: "per linear ft",
            cost: costOf(Math.ceil(railingLinearFt), railingPrice),
            searchTerm: "deck railing kit",
            note: `Perimeter less ${roundTo(attachedSides, 0)} attached ${attachedSides === 1 ? "side" : "sides"}.`,
          },
        ]
      : []),
    ...(includeStairs
      ? [
          {
            id: "stairs",
            name: `Stair treads (${stairSteps} ${stairSteps === 1 ? "step" : "steps"})`,
            quantity: Math.ceil(stairTreadLinearFt),
            measure: "length" as const,
            precision: 0,
            unitOverride: "linear ft",
            unitPrice: deckingPrice,
            unitPriceLabel: "per linear ft",
            cost: costOf(Math.ceil(stairTreadLinearFt), deckingPrice),
            isEstimate: true,
            searchTerm: "decking boards",
            note: `Assumes a 3 ft wide stair. Plus ${stringers} stringers.`,
          },
        ]
      : []),
    {
      id: "hangers",
      name: "Joist hangers",
      quantity: joistHangers,
      measure: "count",
      unitOverride: "hangers",
      isEstimate: true,
      searchTerm: "joist hangers",
    },
    {
      id: "screws",
      name: "Deck screws",
      quantity: screwBoxes,
      measure: "count",
      unitOverride: "boxes (5 lb)",
      isEstimate: true,
      searchTerm: "deck screws",
      note: `About ${screws.toLocaleString("en-US")} screws at roughly 3.5 per square foot. A hidden fastener system is sold by deck area instead.`,
    },
  ];

  const costTotal = sumCost(materials);
  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });

  const deckingAt = (spacingBoardWidth: number) => {
    const pitch = inchesToFeet(spacingBoardWidth + boardGap);
    return Math.ceil((pitch > 0 ? Math.ceil(length / pitch) * width : 0) * wasteMultiplier(wastePct));
  };

  return {
    headline: {
      label: "You need approximately",
      value: Math.ceil(deckingLinearFt),
      measure: "length",
      precision: 0,
      unitOverride: "linear ft of decking",
      sublabel: `${fmt(areaSqFt, "area", 0)} deck with about ${joistCount} joists at ${roundTo(joistSpacing, 0)} in on centre`,
    },
    summary: [
      { label: "Deck area", value: areaSqFt, measure: "area", precision: 0 },
      { label: "Decking rows", value: rows, measure: "count", unitOverride: "rows" },
      {
        label: "Decking needed",
        value: Math.ceil(deckingLinearFt),
        measure: "length",
        precision: 0,
        unitOverride: "linear ft",
        emphasis: true,
      },
      { label: "Joists", value: joistCount, measure: "count", unitOverride: "joists" },
      ...(includeRailing
        ? [
            {
              label: "Railing",
              value: Math.ceil(railingLinearFt),
              measure: "length" as const,
              precision: 0,
              unitOverride: "linear ft",
            },
          ]
        : []),
      { label: "Waste allowance", value: wastePct, measure: "percent" },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "5-4-board",
        name: '5/4 × 6 decking (5.5 in)',
        summary: "The most common residential decking width.",
        recommended: boardWidth >= 5,
        rows: [
          {
            label: "Decking",
            value: deckingAt(5.5),
            measure: "length",
            precision: 0,
            unitOverride: "linear ft",
          },
        ],
      },
      {
        id: "2x4-board",
        name: "2 × 4 decking (3.5 in)",
        summary: "Narrower boards, more rows, more fasteners.",
        recommended: boardWidth < 5,
        rows: [
          {
            label: "Decking",
            value: deckingAt(3.5),
            measure: "length",
            precision: 0,
            unitOverride: "linear ft",
          },
        ],
      },
    ],
    explanation: [
      `A ${roundTo(length, 1)} × ${roundTo(width, 1)} deck is ${fmt(areaSqFt, "area", 0)}. With ${roundTo(boardWidth, 2)} in boards and a ${roundTo(boardGap, 3)} in gap you get ${rows} rows, each ${roundTo(width, 1)} ft long.`,
      `Including ${roundTo(wastePct, 1)}% waste that is about ${fmt(Math.ceil(deckingLinearFt), "length", 0)} of decking to buy.`,
      "Joist and rim quantities follow from the spacing you chose above — they are lumber counts, not a structural design. Beams, posts, and footings are not quantified at all: those sizes come from a span table, a designer, or your building department, so the budget below excludes them.",
    ],
    formulas: [
      { kind: "math", label: "Deck area", expression: "Length × Width" },
      { kind: "math", label: "Decking rows", expression: "⌈Length ÷ ((Board width + gap) ÷ 12)⌉" },
      { kind: "math", label: "Decking", expression: "Rows × Width × (1 + Waste percentage)" },
      { kind: "math", label: "Joists", expression: "⌊Length ÷ (Joist spacing ÷ 12)⌋ + 1" },
      {
        kind: "assumption",
        label: "Beams, posts, footings",
        expression: "Not calculated — structural design required",
      },
    ],
    assumptions: [
      { label: "Board width", value: `${roundTo(boardWidth, 2)} in` },
      { label: "Board gap", value: `${roundTo(boardGap, 3)} in` },
      { label: "Joist spacing", value: `${roundTo(joistSpacing, 0)} in on centre` },
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
      { label: "Deck height", value: `${roundTo(height, 1)} ft` },
      { label: "Railing", value: includeRailing ? `${roundTo(railingLinearFt, 0)} linear ft` : "Not included" },
    ],
    shoppingExtras: [
      // Deliberately unquantified: sizing these is structural design, not
      // arithmetic, so the list names them without inventing a number.
      shoppingItem("beams", "Beams — size and span from your structural design"),
      shoppingItem("posts", "Support posts — size and spacing from your structural design"),
      shoppingItem("footings", "Footings — size and depth per local code and frost line"),
      shoppingItem("concrete", "Concrete for footings"),
      shoppingItem("gravel", "Gravel for footing bases"),
      shoppingItem("flashing", "Ledger flashing"),
      shoppingItem("hardware", "Structural connectors and approved fasteners"),
      shoppingItem("string", "String line, level, and layout square"),
      shoppingItem("sealer", "Stain or sealer for wood decking", undefined, true),
      shoppingItem("permit", "Building permit — check before you start"),
    ],
    warnings: [
      "Material-planning estimate only. Structural requirements, footing sizes, spans, loads, permits, and code requirements vary by location and project. Verify structural design and local building requirements before construction.",
      "Beams, posts, and footings are deliberately not quantified here. Their sizes and spacing depend on span, lumber species and grade, load, soil, and frost depth — get them from a span table, a designer, or your building department, and budget for them separately.",
      "Ledger attachment to a house is the single most common cause of deck failure. Have it detailed and inspected.",
      "Decks almost always require a permit and inspection.",
    ],
    effort: {
      difficulty: "Challenging",
      timeCategory: "Several weekends",
      notes: [
        "Layout, footings, and framing take far longer than laying the boards.",
        "This is the project most worth getting a professional opinion on, even if you build it yourself.",
      ],
    },
  };
}
