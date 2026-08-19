import { bulkPurchaseStep, formatQuantity, roundTo, roundUpTo } from "@/lib/units";
import {
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
import type { CalculationContext, CalculationResult } from "@/types/project";

/**
 * Concrete slab / patio.
 *
 * Canonical units in: length + width in feet, thickness + base depth in inches,
 * bag size in cubic feet of yielded concrete.
 */
export function calculateConcrete({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const length = num(values, "length");
  const width = num(values, "width");
  const thicknessIn = num(values, "thickness");
  const wastePct = num(values, "waste", planningDefaults.wasteConcrete);
  const pricePerYard = num(values, "concretePrice", prices.concretePerCubicYard);
  const bagYieldCuFt = num(values, "bagYield", 0.45);
  const bagPrice = num(values, "bagPrice", prices.concreteBag60lb);
  const baseDepthIn = num(values, "baseDepth", 4);
  const gravelPrice = num(values, "gravelPrice", prices.gravelPerCubicYard);
  const reinforcement = str(values, "reinforcement", "wire-mesh");

  const areaSqFt = length * width;
  const cubicFeet = areaSqFt * inchesToFeet(thicknessIn);
  const cubicYards = cubicFeetToYards(cubicFeet);

  const multiplier = wasteMultiplier(wastePct);
  const adjustedYards = cubicYards * multiplier;

  const orderStep = bulkPurchaseStep("volumeYd", unitSystem);
  const purchaseYards = roundUpTo(adjustedYards, orderStep);

  // Bags are sold by yield, and a partial bag is not a thing you can buy.
  const bagsNeeded = packagesNeeded(cubicFeet * multiplier, bagYieldCuFt);

  // Base course volume (compacted gravel under the slab).
  const baseCubicFeet = areaSqFt * inchesToFeet(baseDepthIn);
  const baseYards = cubicFeetToYards(baseCubicFeet) * wasteMultiplier(10);
  const basePurchaseYards = roundUpTo(baseYards, orderStep);

  const readyMixCost = costOf(purchaseYards, pricePerYard);
  const bagCost = costOf(bagsNeeded, bagPrice);
  const baseCost = baseDepthIn > 0 ? costOf(basePurchaseYards, gravelPrice) : 0;

  // Ready-mix is the default recommendation past roughly a cubic yard: below
  // that, bags usually win on cost and hassle.
  const readyMixRecommended = adjustedYards >= 1;
  const concreteCost = readyMixRecommended ? readyMixCost : bagCost;

  const reinforcementArea = areaSqFt * 1.05; // modest overlap allowance
  const reinforcementLine =
    reinforcement === "none"
      ? null
      : {
          id: "reinforcement",
          name:
            reinforcement === "rebar"
              ? "Rebar (#3/#4, 16 in grid)"
              : "Welded wire mesh",
          quantity: reinforcementArea,
          measure: "area" as const,
          precision: 0,
          note: "Coverage allowance including overlap. Reinforcement needs vary by use and local practice.",
          isEstimate: true,
          searchTerm: reinforcement === "rebar" ? "concrete rebar" : "welded wire mesh concrete",
        };

  const perimeterFt = 2 * (length + width);
  const formBoardFt = roundTo(perimeterFt * 1.1, 1);
  const stakes = Math.max(4, Math.ceil(perimeterFt / 3) + 4);

  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });
  const d = describeFor(unitSystem);
  const metric = unitSystem === "metric";

  const materials = [
    readyMixRecommended
      ? {
          id: "ready-mix",
          name: "Ready-mix concrete (delivered)",
          quantity: purchaseYards,
          measure: "volumeYd" as const,
          precision: 2,
          unitPrice: pricePerYard,
          unitPriceMeasure: "volumeYd" as const,
          cost: readyMixCost,
          searchTerm: "ready mix concrete delivery",
          note: "Order quantity rounded up to the nearest supplier increment.",
        }
      : {
          id: "concrete-bags",
          name: `Concrete mix bags (${roundTo(bagYieldCuFt, 2)} cu ft yield)`,
          quantity: bagsNeeded,
          measure: "count" as const,
          unitOverride: "bags",
          unitPrice: bagPrice,
          unitPriceLabel: "per bag",
          cost: bagCost,
          searchTerm: "concrete mix bags",
        },
    ...(baseDepthIn > 0
      ? [
          {
            id: "base-gravel",
            name: "Compactable base gravel",
            quantity: basePurchaseYards,
            measure: "volumeYd" as const,
            precision: 2,
            unitPrice: gravelPrice,
            unitPriceMeasure: "volumeYd" as const,
            cost: baseCost,
            searchTerm: "crushed gravel paver base",
            note: "Includes 10% compaction allowance.",
          },
        ]
      : []),
    ...(reinforcementLine ? [reinforcementLine] : []),
    {
      id: "form-boards",
      name: "Form boards (2×4 or 2×6)",
      quantity: formBoardFt,
      measure: "length" as const,
      precision: 0,
      unitOverride: "linear ft",
      isEstimate: true,
      searchTerm: "2x4 lumber",
      note: "Perimeter plus 10% for corners and overlap.",
    },
    {
      id: "stakes",
      name: "Form stakes",
      quantity: stakes,
      measure: "count" as const,
      unitOverride: "stakes",
      isEstimate: true,
      searchTerm: "wood form stakes",
      note: `Roughly one every ${d.length(3)}, plus corners.`,
    },
  ];

  const costTotal = roundTo(
    concreteCost + baseCost,
    2,
  );

  return {
    headline: {
      label: "You need approximately",
      value: adjustedYards,
      measure: "volumeYd",
      precision: 2,
      sublabel: `Recommended purchase: ${fmt(purchaseYards, "volumeYd", 2)} including ${roundTo(wastePct, 1)}% waste`,
    },
    summary: [
      { label: "Project area", value: areaSqFt, measure: "area", precision: 0 },
      { label: "Slab thickness", value: thicknessIn, measure: "inch", precision: 2 },
      { label: "Calculated volume", value: cubicYards, measure: "volumeYd", precision: 2 },
      { label: "Waste allowance", value: wastePct, measure: "percent" },
      {
        label: "Recommended purchase",
        value: purchaseYards,
        measure: "volumeYd",
        precision: 2,
        emphasis: true,
      },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "ready-mix",
        name: "Ready-mix delivery",
        summary: `One truck, one pour. Best once you pass about ${metric ? "a cubic metre" : "a cubic yard"}.`,
        recommended: readyMixRecommended,
        rows: [
          { label: "Order quantity", value: purchaseYards, measure: "volumeYd", precision: 2 },
          { label: "Estimated concrete cost", value: readyMixCost, measure: "currency" },
        ],
        totalCost: readyMixCost,
      },
      {
        id: "bags",
        name: "Bagged concrete",
        summary: "No delivery minimum, but mixing is the whole afternoon.",
        recommended: !readyMixRecommended,
        rows: [
          {
            label: "Bags needed",
            value: bagsNeeded,
            measure: "count",
            unitOverride: "bags",
          },
          { label: "Estimated concrete cost", value: bagCost, measure: "currency" },
        ],
        totalCost: bagCost,
      },
    ],
    explanation: [
      `A ${d.length(length)} × ${d.length(width)} slab at ${d.inch(thicknessIn)} works out to ${d.area(areaSqFt)} of surface and ${d.volumeYd(cubicYards)} of concrete before waste.`,
      `Concrete is unforgiving: running short mid-pour means a cold joint. The ${roundTo(wastePct, 1)}% allowance covers spillage, uneven subgrade, and form deflection, which is why the recommended order is ${fmt(purchaseYards, "volumeYd", 2)}.`,
      readyMixRecommended
        ? `At this size, ready-mix delivery is normally the practical choice — ${bagsNeeded} bags would need mixing by hand.`
        : `At this size, bagged mix is usually easier than meeting a delivery minimum. Plan on ${bagsNeeded} bags.`,
    ],
    formulas: [
      { kind: "math", label: "Area", expression: "Length × Width" },
      /*
       * The ÷ 12 and ÷ 27 exist only to reconcile inches, feet, and yards. In
       * metric the same arithmetic is one step, so showing the imperial
       * divisors to a metric reader is noise that does not match their numbers.
       */
      ...(metric
        ? ([{ kind: "math", label: "Volume", expression: "Area × Thickness" }] as const)
        : ([
            { kind: "math", label: "Volume", expression: "Area × (Thickness ÷ 12)" },
            { kind: "math", label: "Cubic yards", expression: "Cubic feet ÷ 27" },
          ] as const)),
      {
        kind: "math",
        label: "Waste adjusted",
        expression: "Calculated quantity × (1 + Waste percentage)",
      },
      {
        kind: "assumption",
        label: "Order rounding",
        expression: `Rounded up to the next ${fmt(orderStep, "volumeYd", 2)}`,
      },
      {
        kind: "assumption",
        label: "Base gravel",
        expression: metric
          ? "Area × Base depth × 1.10 compaction allowance"
          : "Area × (Base depth ÷ 12) × 1.10 compaction allowance",
      },
    ],
    assumptions: [
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
      { label: "Concrete price", value: d.pricePerUnit(pricePerYard, "volumeYd") },
            // Left imperial on purpose: this is the figure printed on the bag, and
      // it is what the select above offers. See describe.ts on product specs.
      { label: "Bag yield", value: d.productSpec(`${roundTo(bagYieldCuFt, 2)} cu ft per bag`) },
      { label: "Reinforcement", value: reinforcement === "none" ? "None selected" : reinforcementLine?.name ?? "—" },
      {
        label: "Base course",
        value: baseDepthIn > 0 ? `${d.inch(baseDepthIn)} compacted gravel` : "Not included",
      },
    ],
    shoppingExtras: [
      shoppingItem("screed", "Screed board (straight 2×4 longer than the slab width)"),
      shoppingItem("expansion", "Expansion joint material where the slab meets existing concrete"),
      shoppingItem("float", "Bull float or magnesium float"),
      shoppingItem("edger", "Concrete edger and groover"),
      shoppingItem("curing", "Curing compound or plastic sheeting"),
      shoppingItem("ppe", "Waterproof gloves, eye protection, knee pads"),
      shoppingItem("rebar-chairs", "Rebar chairs or mesh supports", undefined, reinforcement === "none"),
    ],
    warnings: [
      "Concrete sets on its own schedule. Have every tool, helper, and form check done before the truck arrives.",
      "Slab thickness, reinforcement, and base depth requirements vary by use and by local code. Verify before you pour.",
      "Wet concrete is caustic and causes serious burns through skin it sits against — kneeling in it in wet jeans is the classic injury. Waterproof gloves, boots, and eye protection, and rinse any splash off straight away.",
    ],
    effort: {
      difficulty: adjustedYards > 3 ? "Challenging" : "Moderate",
      timeCategory: adjustedYards > 3 ? "A full weekend with help" : "One long day",
      notes: [
        "Excavation and base prep is the bulk of the labour.",
        "Finishing concrete is a timed skill — a second experienced pair of hands pays for itself.",
      ],
    },
  };
}
