import { bulkPurchaseStep, formatQuantity, roundTo, roundUpTo } from "@/lib/units";
import {
  circleArea,
  costOf,
  cubicFeetToYards,
  inchesToFeet,
  num,
  packagesNeeded,
  shoppingItem,
  str,
  wasteMultiplier,
} from "@/lib/calc/helpers";
import { planningDefaults, prices } from "@/lib/pricing";
import type { CalculationContext, CalculationResult, MaterialLine } from "@/types/project";

/** Mulch volume for rectangular, circular, or known-area beds. */
export function calculateMulch({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const shape = str(values, "shape", "rectangle");
  const depthIn = num(values, "depth", 3);
  const wastePct = num(values, "waste", planningDefaults.wasteMulch);
  const bagSize = Math.max(num(values, "bagSize", 2), 0.1);
  const bagPrice = num(values, "bagPrice", prices.mulchBag2CuFt);
  const bulkPrice = num(values, "bulkPrice", prices.mulchPerCubicYard);

  const areaSqFt =
    shape === "circle"
      ? circleArea(num(values, "diameter"))
      : shape === "custom"
        ? num(values, "area")
        : num(values, "length") * num(values, "width");

  const cubicFeet = areaSqFt * inchesToFeet(depthIn);
  const multiplier = wasteMultiplier(wastePct);
  const adjustedCuFt = cubicFeet * multiplier;
  const cubicYards = cubicFeetToYards(cubicFeet);
  const adjustedYards = cubicFeetToYards(adjustedCuFt);

  const orderStep = bulkPurchaseStep("volumeYd", unitSystem);
  const purchaseYards = roundUpTo(adjustedYards, orderStep);
  const bags = packagesNeeded(adjustedCuFt, bagSize);

  const bulkCost = costOf(purchaseYards, bulkPrice);
  const bagCost = costOf(bags, bagPrice);
  const bulkIsCheaper = bulkCost > 0 && bulkCost < bagCost;
  // Below roughly a cubic yard, bags win on convenience even when bulk is cheaper.
  const recommendBulk = adjustedYards >= 1 && bulkIsCheaper;

  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });

  const materials: MaterialLine[] = recommendBulk
    ? [
        {
          id: "mulch-bulk",
          name: "Bulk mulch (delivered)",
          quantity: purchaseYards,
          measure: "volumeYd",
          precision: 2,
          unitPrice: bulkPrice,
          unitPriceMeasure: "volumeYd" as const,
          cost: bulkCost,
          searchTerm: "bulk mulch delivery",
        },
      ]
    : [
        {
          id: "mulch-bags",
          name: `Bagged mulch (${roundTo(bagSize, 2)} cu ft bags)`,
          quantity: bags,
          measure: "count",
          unitOverride: "bags",
          unitPrice: bagPrice,
          unitPriceLabel: "per bag",
          cost: bagCost,
          searchTerm: "bagged mulch",
        },
      ];

  if (num(values, "fabricPrice", 0) > 0) {
    materials.push({
      id: "fabric",
      name: "Landscape fabric",
      quantity: Math.ceil(areaSqFt),
      measure: "area",
      precision: 0,
      unitPrice: num(values, "fabricPrice", 0),
      unitPriceMeasure: "area" as const,
      cost: costOf(Math.ceil(areaSqFt), num(values, "fabricPrice", 0)),
      searchTerm: "landscape fabric",
    });
  }

  const costTotal = roundTo(
    materials.reduce((total, line) => total + (line.cost ?? 0), 0),
    2,
  );
  return {
    headline: {
      label: "You need approximately",
      value: adjustedYards,
      measure: "volumeYd",
      precision: 2,
      sublabel: recommendBulk
        ? `Order ${fmt(purchaseYards, "volumeYd", 2)} in bulk`
        : `About ${bags} ${bags === 1 ? "bag" : "bags"} at ${roundTo(bagSize, 2)} cu ft each`,
    },
    summary: [
      { label: "Bed area", value: areaSqFt, measure: "area", precision: 0 },
      { label: "Depth", value: depthIn, measure: "inch", precision: 1 },
      { label: "Volume", value: cubicYards, measure: "volumeYd", precision: 2 },
      { label: "Waste allowance", value: wastePct, measure: "percent" },
      {
        label: "Recommended purchase",
        value: recommendBulk ? purchaseYards : adjustedYards,
        measure: "volumeYd",
        precision: 2,
        emphasis: true,
      },
      { label: "Equivalent bags", value: bags, measure: "count", unitOverride: "bags" },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "bulk",
        name: "Bulk delivery",
        summary: "Cheaper per yard once you need more than about a yard.",
        recommended: recommendBulk,
        rows: [
          { label: "Order", value: purchaseYards, measure: "volumeYd", precision: 2 },
          { label: "Estimated cost", value: bulkCost, measure: "currency" },
        ],
        totalCost: bulkCost,
      },
      {
        id: "bags",
        name: "Bagged mulch",
        summary: "No delivery to schedule, no pile on the driveway.",
        recommended: !recommendBulk,
        rows: [
          { label: "Bags", value: bags, measure: "count", unitOverride: "bags" },
          { label: "Estimated cost", value: bagCost, measure: "currency" },
        ],
        totalCost: bagCost,
      },
    ],
    explanation: [
      `A ${fmt(areaSqFt, "area", 0)} bed at ${roundTo(depthIn, 1)} in deep needs ${fmt(cubicYards, "volumeYd", 2)} of mulch, or ${roundTo(cubicFeet, 1)} cubic feet.`,
      `With a ${roundTo(wastePct, 1)}% allowance for settling and uneven spreading, plan on ${fmt(adjustedYards, "volumeYd", 2)}.`,
      bulkIsCheaper
        ? `Bulk works out to about ${roundTo(bulkCost, 0)} versus ${roundTo(bagCost, 0)} in bags — a saving of roughly ${roundTo(Math.abs(bagCost - bulkCost), 0)} if you can handle a delivered pile.`
        : `At your prices, bags come out at about ${roundTo(bagCost, 0)} versus ${roundTo(bulkCost, 0)} bulk.`,
    ],
    formulas: [
      {
        kind: "math",
        label: "Area",
        expression:
          shape === "circle"
            ? "π × (Diameter ÷ 2)²"
            : shape === "custom"
              ? "Entered square footage"
              : "Length × Width",
      },
      { kind: "math", label: "Volume", expression: "Area × (Depth ÷ 12)" },
      { kind: "math", label: "Cubic yards", expression: "Cubic feet ÷ 27" },
      { kind: "math", label: "Bags", expression: "⌈Adjusted cubic feet ÷ Bag size⌉" },
    ],
    assumptions: [
      { label: "Depth", value: `${roundTo(depthIn, 1)} in` },
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
      { label: "Bag size", value: `${roundTo(bagSize, 2)} cu ft` },
      { label: "Bulk price", value: `$${roundTo(bulkPrice, 2)} per yd³` },
    ],
    shoppingExtras: [
      shoppingItem("wheelbarrow", "Wheelbarrow"),
      shoppingItem("rake", "Mulch rake or garden rake"),
      shoppingItem("edging", "Bed edging", undefined, true),
      shoppingItem("gloves", "Gloves"),
      shoppingItem("tarp", "Tarp to protect the driveway", undefined, true),
    ],
    warnings: [
      "Keep mulch a few inches clear of trunks and stems — piling it against them invites rot.",
      "Two to three inches is enough for most beds. Deeper does not suppress weeds better, it just holds water against roots.",
    ],
    effort: {
      difficulty: "Easy",
      timeCategory: adjustedYards > 4 ? "A full day" : "A few hours",
      notes: [
        "A cubic yard is roughly nine to fourteen wheelbarrow loads.",
        "Weeding and edging before spreading is what makes it look finished.",
      ],
    },
  };
}
