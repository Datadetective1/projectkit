import { formatCurrency, formatQuantity, roundTo } from "@/lib/units";
import {
  costOf,
  num,
  packagesNeeded,
  shoppingItem,
  str,
  sumCost,
  wasteMultiplier,
} from "@/lib/calc/helpers";
import { describeFor } from "@/lib/calc/describe";
import { planningDefaults, prices } from "@/lib/pricing";
import type { CalculationContext, CalculationResult, MaterialLine } from "@/types/project";

const MATERIAL_LABELS: Record<string, string> = {
  laminate: "Laminate",
  lvp: "Luxury vinyl plank",
  engineered: "Engineered hardwood",
  hardwood: "Solid hardwood",
  tile: "Tile plank",
};

/** Flooring across up to three areas: boxes, leftover, and cost. */
export function calculateFlooring({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const roomCount = Math.min(Math.max(num(values, "roomCount", 1), 1), 3);
  const material = str(values, "material", "lvp");

  const rooms = [
    { length: num(values, "length1"), width: num(values, "width1") },
    roomCount >= 2
      ? { length: num(values, "length2"), width: num(values, "width2") }
      : { length: 0, width: 0 },
    roomCount >= 3
      ? { length: num(values, "length3"), width: num(values, "width3") }
      : { length: 0, width: 0 },
  ].filter((room) => room.length > 0 && room.width > 0);

  const rawArea = rooms.reduce((total, room) => total + room.length * room.width, 0);

  /**
   * Real perimeter, summed per room. Deriving it from area alone assumes a
   * square room and badly under-counts a long one — a 40 × 5 ft hallway is
   * 90 ft around, but 4 × √200 suggests 57 ft, which is a trip back to the
   * store for more trim.
   */
  const perimeter = rooms.reduce((total, room) => total + 2 * (room.length + room.width), 0);

  const wastePct = num(values, "waste", planningDefaults.wasteFlooring);
  const adjustedArea = rawArea * wasteMultiplier(wastePct);

  const sqFtPerBox = Math.max(num(values, "sqFtPerBox", 24), 0.01);
  const pricePerSqFt = num(values, "pricePerSqFt", prices.flooringPerSqFt);
  const pricePerBox = num(values, "pricePerBox", 0);
  const includeUnderlayment = num(values, "underlaymentPrice", 0) > 0;
  const underlaymentPrice = num(values, "underlaymentPrice", 0);

  const boxes = packagesNeeded(adjustedArea, sqFtPerBox);
  const coverage = boxes * sqFtPerBox;
  const leftover = Math.max(coverage - rawArea, 0);

  const boxCost =
    pricePerBox > 0 ? costOf(boxes, pricePerBox) : costOf(coverage, pricePerSqFt);
  const effectivePerSqFt = coverage > 0 ? boxCost / coverage : 0;

  const transitionCount = Math.max(roomCount, 1);

  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });
  const d = describeFor(unitSystem);

  const materials: MaterialLine[] = [
    {
      id: "flooring",
      name: `${MATERIAL_LABELS[material] ?? "Flooring"} (${d.area(sqFtPerBox, 2)} per box)`,
      quantity: boxes,
      measure: "count",
      unitOverride: boxes === 1 ? "box" : "boxes",
      unitPrice: pricePerBox > 0 ? pricePerBox : pricePerSqFt,
      // Priced per box or per unit of area — and area needs converting, so it
      // is declared as a measure rather than a fixed label. The quantity beside
      // it is boxes either way, which is how the trade quotes this.
      ...(pricePerBox > 0
        ? { unitPriceLabel: "per box" }
        : { unitPriceMeasure: "area" as const }),
      cost: boxCost,
      searchTerm: `${MATERIAL_LABELS[material] ?? "flooring"} flooring`,
      note: `Covers ${fmt(coverage, "area", 0)}.`,
    },
    ...(includeUnderlayment
      ? [
          {
            id: "underlayment",
            name: "Underlayment",
            quantity: Math.ceil(adjustedArea),
            measure: "area" as const,
            precision: 0,
            unitPrice: underlaymentPrice,
            unitPriceMeasure: "area" as const,
            cost: costOf(Math.ceil(adjustedArea), underlaymentPrice),
            searchTerm: "flooring underlayment",
          },
        ]
      : []),
    {
      id: "transitions",
      name: "Transition strips",
      quantity: transitionCount,
      measure: "count",
      unitOverride: transitionCount === 1 ? "strip" : "strips",
      isEstimate: true,
      searchTerm: "floor transition strip",
      note: "One per doorway or change of material.",
    },
    {
      id: "quarter-round",
      name: "Quarter round / shoe moulding",
      quantity: Math.ceil(perimeter * 1.1),
      measure: "length",
      precision: 0,
      unitOverride: "linear ft",
      isEstimate: true,
      searchTerm: "quarter round moulding",
      note: "Room perimeter plus 10% for cuts.",
    },
  ];

  const costTotal = sumCost(materials);
  const scenarioBoxes = (perSqFt: number) => costOf(coverage, perSqFt);

  return {
    headline: {
      label: "You need approximately",
      value: boxes,
      measure: "count",
      unitOverride: boxes === 1 ? "box" : "boxes",
      sublabel: `${fmt(adjustedArea, "area", 0)} including ${roundTo(wastePct, 1)}% waste, covering ${fmt(rawArea, "area", 0)} of floor`,
    },
    summary: [
      { label: "Floor area", value: rawArea, measure: "area", precision: 0 },
      { label: "Waste allowance", value: wastePct, measure: "percent" },
      { label: "Area to buy", value: adjustedArea, measure: "area", precision: 0 },
      {
        label: "Boxes",
        value: boxes,
        measure: "count",
        unitOverride: boxes === 1 ? "box" : "boxes",
        emphasis: true,
      },
      {
        label: "Leftover after install",
        value: leftover,
        measure: "area",
        precision: 0,
        note: "Keep a box for future repairs.",
      },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "budget",
        name: "Budget material",
        summary: "Entry-level laminate or vinyl plank.",
        recommended: pricePerSqFt <= 2.75,
        rows: [{ label: "Estimated flooring cost", value: scenarioBoxes(2.49), measure: "currency" }],
        totalCost: scenarioBoxes(2.49),
      },
      {
        id: "mid",
        name: "Mid-range material",
        summary: "Thicker wear layer, better locking system.",
        recommended: pricePerSqFt > 2.75 && pricePerSqFt <= 5,
        rows: [{ label: "Estimated flooring cost", value: scenarioBoxes(4.29), measure: "currency" }],
        totalCost: scenarioBoxes(4.29),
      },
      {
        id: "your-price",
        name: "Your price",
        summary: `At ${d.pricePerUnit(effectivePerSqFt, "area")} as entered.`,
        recommended: pricePerSqFt > 5,
        rows: [{ label: "Estimated flooring cost", value: boxCost, measure: "currency" }],
        totalCost: boxCost,
      },
    ],
    explanation: [
      `Your ${roomCount === 1 ? "room covers" : `${roundTo(roomCount, 0)} areas cover`} ${fmt(rawArea, "area", 0)}. Adding ${roundTo(wastePct, 1)}% for cuts and mistakes brings the buying target to ${fmt(adjustedArea, "area", 0)}.`,
      `Flooring is sold by the box, so ${boxes} ${boxes === 1 ? "box" : "boxes"} at ${d.area(sqFtPerBox, 2)} each is what you actually take home — ${d.area(coverage)} of material.`,
      leftover > 0
        ? `That leaves roughly ${fmt(leftover, "area", 0)} spare. Keep it: matching a discontinued run later is close to impossible.`
        : "There is very little spare in this order. Consider one extra box for future repairs.",
    ],
    formulas: [
      { kind: "math", label: "Floor area", expression: "Σ (Length × Width) for each area" },
      { kind: "math", label: "Area to buy", expression: "Floor area × (1 + Waste percentage)" },
      { kind: "math", label: "Boxes", expression: "⌈Area to buy ÷ Area per box⌉" },
      { kind: "math", label: "Leftover", expression: "(Boxes × Area per box) − Floor area" },
    ],
    assumptions: [
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
      { label: "Box coverage", value: d.area(sqFtPerBox, 2) },
      { label: "Material", value: MATERIAL_LABELS[material] ?? "Flooring" },
      {
        label: "Pricing basis",
        value:
          pricePerBox > 0
            ? `${formatCurrency(pricePerBox)} per box`
            : d.pricePerUnit(pricePerSqFt, "area"),
      },
    ],
    shoppingExtras: [
      shoppingItem("spacers", "Expansion spacers"),
      shoppingItem("tapping", "Tapping block and pull bar"),
      shoppingItem("saw", "Miter saw or flooring cutter"),
      shoppingItem("knee-pads", "Knee pads"),
      shoppingItem("moisture", "Moisture barrier for concrete subfloor", undefined, true),
      shoppingItem("leveler", "Floor leveller for low spots", undefined, true),
    ],
    warnings: [
      "Let the flooring acclimate in the room for the time the manufacturer specifies before installing.",
      "Diagonal or herringbone layouts need noticeably more waste — 15% or more.",
    ],
    effort: {
      difficulty: "Moderate",
      timeCategory: rawArea > 600 ? "A full weekend" : "One to two days",
      notes: [
        "Floating floors are among the friendliest DIY installs.",
        "Subfloor prep and door undercuts are where the time goes.",
      ],
    },
  };
}
