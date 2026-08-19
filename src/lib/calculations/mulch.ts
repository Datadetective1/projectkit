import { bulkPurchaseStep, formatCurrency, formatQuantity, roundTo, roundUpTo } from "@/lib/units";
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
import { describeFor } from "@/lib/calc/describe";
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
  const d = describeFor(unitSystem);
  const metric = unitSystem === "metric";

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
        summary: `Cheaper per ${d.unitName("volumeYd").replace(/s$/, "")} once you need more than about one.`,
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
      `A ${d.area(areaSqFt)} bed at ${d.inch(depthIn)} deep needs ${d.volumeYd(cubicYards)} of mulch.`,
      `With a ${roundTo(wastePct, 1)}% allowance for settling and uneven spreading, plan on ${fmt(adjustedYards, "volumeYd", 2)}.`,
      bulkIsCheaper
        ? `Bulk works out to about ${formatCurrency(bulkCost)} versus ${formatCurrency(bagCost)} in bags — a saving of roughly ${formatCurrency(Math.abs(bagCost - bulkCost))} if you can handle a delivered pile.`
        : `At your prices, bags come out at about ${formatCurrency(bagCost)} versus ${formatCurrency(bulkCost)} bulk.`,
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
      {
        kind: "math",
        label: "Volume",
        expression: metric ? "Area × Depth" : "Area × (Depth ÷ 12)",
      },
      ...(metric
        ? []
        : [{ kind: "math" as const, label: "Cubic yards", expression: "Cubic feet ÷ 27" }]),
      { kind: "math", label: "Bags", expression: "⌈Adjusted volume ÷ Bag size⌉" },
    ],
    assumptions: [
      { label: "Depth", value: d.inch(depthIn) },
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
      // Left imperial: this is the bag size printed on the packaging.
      { label: "Bag size", value: d.productSpec(`${roundTo(bagSize, 2)} cu ft`) },
      { label: "Bulk price", value: d.pricePerUnit(bulkPrice, "volumeYd") },
    ],
    shoppingExtras: [
      shoppingItem("wheelbarrow", "Wheelbarrow"),
      shoppingItem("rake", "Mulch rake or garden rake"),
      shoppingItem("edging", "Bed edging", undefined, true),
      shoppingItem("gloves", "Gloves"),
      shoppingItem("tarp", "Tarp to protect the driveway", undefined, true),
    ],
    warnings: [
      `Keep mulch ${metric ? "a few centimetres" : "a few inches"} clear of trunks and stems — piling it against them invites rot.`,
      `${metric ? "Five to eight centimetres" : "Two to three inches"} is enough for most beds. Deeper does not suppress weeds better, it just holds water against roots.`,
    ],
    effort: {
      difficulty: "Easy",
      timeCategory: adjustedYards > 4 ? "A full day" : "A few hours",
      notes: [
        `A ${d.unitName("volumeYd").replace(/s$/, "")} is roughly ${metric ? "twelve to eighteen" : "nine to fourteen"} wheelbarrow loads.`,
        "Weeding and edging before spreading is what makes it look finished.",
      ],
    },
  };
}
