import { formatQuantity, roundTo } from "@/lib/units";
import {
  circleArea,
  costOf,
  num,
  packagesNeeded,
  shoppingItem,
  wasteMultiplier,
} from "@/lib/calc/helpers";
import { planningDefaults, prices } from "@/lib/pricing";
import type { CalculationContext, CalculationResult, MaterialLine } from "@/types/project";

/** Sod: area across sections, rolls, pallets, and cost. */
export function calculateSod({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const rectArea = num(values, "length") * num(values, "width");
  const secondArea = num(values, "length2") * num(values, "width2");
  const circleDiameter = num(values, "diameter", 0);
  const circle = circleDiameter > 0 ? circleArea(circleDiameter) : 0;
  const extraArea = num(values, "extraArea", 0);

  const rawArea = Math.max(rectArea, 0) + Math.max(secondArea, 0) + circle + Math.max(extraArea, 0);

  const wastePct = num(values, "waste", planningDefaults.wasteSod);
  const adjustedArea = rawArea * wasteMultiplier(wastePct);

  const rollCoverage = Math.max(
    num(values, "rollCoverage", planningDefaults.sodRollCoverageSqFt),
    0.1,
  );
  const palletCoverage = Math.max(
    num(values, "palletCoverage", planningDefaults.sodPalletCoverageSqFt),
    1,
  );
  const pricePerSqFt = num(values, "pricePerSqFt", prices.sodPerSqFt);
  const pricePerPallet = num(values, "pricePerPallet", prices.sodPallet);

  const rolls = packagesNeeded(adjustedArea, rollCoverage);
  const pallets = packagesNeeded(adjustedArea, palletCoverage);

  const byArea = costOf(adjustedArea, pricePerSqFt);
  const byPallet = costOf(pallets, pricePerPallet);
  const palletIsBetter = byPallet > 0 && byPallet <= byArea;

  const materials: MaterialLine[] = [
    palletIsBetter
      ? {
          id: "sod-pallets",
          name: `Sod (${roundTo(palletCoverage, 0)} sq ft pallets)`,
          quantity: pallets,
          measure: "count",
          unitOverride: pallets === 1 ? "pallet" : "pallets",
          unitPrice: pricePerPallet,
          unitPriceLabel: "per pallet",
          cost: byPallet,
          searchTerm: "sod pallet delivery",
          note: `${rolls} rolls, covering ${roundTo(pallets * palletCoverage, 0)} sq ft.`,
        }
      : {
          id: "sod-area",
          name: "Sod",
          quantity: Math.ceil(adjustedArea),
          measure: "area",
          precision: 0,
          unitPrice: pricePerSqFt,
          unitPriceMeasure: "area" as const,
          cost: byArea,
          searchTerm: "sod delivery",
          note: `About ${rolls} rolls or ${pallets} ${pallets === 1 ? "pallet" : "pallets"}.`,
        },
  ];

  if (num(values, "starterFertilizerPrice", 0) > 0) {
    const bags = Math.max(1, packagesNeeded(rawArea, 5000));
    materials.push({
      id: "starter-fertilizer",
      name: "Starter fertilizer",
      quantity: bags,
      measure: "count",
      unitOverride: bags === 1 ? "bag" : "bags",
      unitPrice: num(values, "starterFertilizerPrice", 0),
      unitPriceLabel: "per bag",
      cost: costOf(bags, num(values, "starterFertilizerPrice", 0)),
      isEstimate: true,
      searchTerm: "lawn starter fertilizer",
      note: "One bag covers roughly 5,000 sq ft.",
    });
  }

  const costTotal = roundTo(
    materials.reduce((total, line) => total + (line.cost ?? 0), 0),
    2,
  );
  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });

  return {
    headline: {
      label: "You need approximately",
      value: adjustedArea,
      measure: "area",
      precision: 0,
      sublabel: `${rolls} rolls, or ${pallets} ${pallets === 1 ? "pallet" : "pallets"}`,
    },
    summary: [
      { label: "Lawn area", value: rawArea, measure: "area", precision: 0 },
      { label: "Waste allowance", value: wastePct, measure: "percent" },
      {
        label: "Sod to buy",
        value: adjustedArea,
        measure: "area",
        precision: 0,
        emphasis: true,
      },
      { label: "Rolls", value: rolls, measure: "count", unitOverride: "rolls" },
      { label: "Pallets", value: pallets, measure: "count", unitOverride: pallets === 1 ? "pallet" : "pallets" },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "by-pallet",
        name: "Priced by the pallet",
        summary: "How most sod farms sell it.",
        recommended: palletIsBetter,
        rows: [
          { label: "Pallets", value: pallets, measure: "count", unitOverride: "pallets" },
          { label: "Estimated cost", value: byPallet, measure: "currency" },
        ],
        totalCost: byPallet,
      },
      {
        id: "by-sqft",
        name: "Priced by the square foot",
        summary: "Common at garden centres for smaller quantities.",
        recommended: !palletIsBetter,
        rows: [
          { label: "Area", value: adjustedArea, measure: "area", precision: 0 },
          { label: "Estimated cost", value: byArea, measure: "currency" },
        ],
        totalCost: byArea,
      },
    ],
    explanation: [
      `Your sections add up to ${fmt(rawArea, "area", 0)} of lawn.`,
      `Sod gets trimmed at every curve and edge, so a ${roundTo(wastePct, 1)}% allowance brings the order to ${fmt(adjustedArea, "area", 0)} — ${rolls} rolls or ${pallets} ${pallets === 1 ? "pallet" : "pallets"}.`,
      "Order sod for delivery the morning you plan to lay it. On a pallet in summer heat it starts breaking down within a day or two.",
    ],
    formulas: [
      { kind: "math", label: "Area", expression: "Σ (Length × Width) + π × (Diameter ÷ 2)² + extra area" },
      { kind: "math", label: "Sod to buy", expression: "Area × (1 + Waste percentage)" },
      { kind: "math", label: "Rolls", expression: "⌈Sod to buy ÷ Roll coverage⌉" },
      { kind: "math", label: "Pallets", expression: "⌈Sod to buy ÷ Pallet coverage⌉" },
    ],
    assumptions: [
      { label: "Roll coverage", value: `${roundTo(rollCoverage, 1)} sq ft` },
      { label: "Pallet coverage", value: `${roundTo(palletCoverage, 0)} sq ft` },
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
    ],
    shoppingExtras: [
      shoppingItem("topsoil", "Topsoil or compost for levelling"),
      shoppingItem("starter", "Starter fertilizer"),
      shoppingItem("roller", "Lawn roller (rental)"),
      shoppingItem("knife", "Sod knife or old bread knife for trimming"),
      shoppingItem("sprinkler", "Sprinkler and hose"),
      shoppingItem("rake", "Landscape rake"),
      shoppingItem("tiller", "Tiller rental for compacted soil", undefined, true),
    ],
    warnings: [
      "Fresh sod needs watering within half an hour of being laid, and daily for the first couple of weeks.",
      "Prepare and grade the soil before delivery day — sod cannot wait while you rototill.",
    ],
    effort: {
      difficulty: "Moderate",
      timeCategory: rawArea > 2000 ? "A full weekend with help" : "One day",
      notes: [
        "Soil prep is the whole job; laying sod is the easy part.",
        "A pallet weighs roughly a ton — plan how it gets to the back yard.",
      ],
    },
  };
}
