import { bulkPurchaseStep, formatQuantity, roundTo, roundUpTo } from "@/lib/units";
import {
  costOf,
  cubicFeetToYards,
  inchesToFeet,
  num,
  shoppingItem,
  str,
  wasteMultiplier,
} from "@/lib/calc/helpers";
import { describeFor } from "@/lib/calc/describe";
import { planningDefaults, prices } from "@/lib/pricing";
import type { CalculationContext, CalculationResult, MaterialLine } from "@/types/project";

const MATERIAL_NAMES: Record<string, string> = {
  "100": "Crushed stone / #57",
  "96": "Pea gravel",
  "105": "Crusher run / road base",
  "98": "River rock",
  "99": "Decomposed granite",
};

/** Gravel and aggregate: volume, weight, and purchase quantity. */
export function calculateGravel({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const length = num(values, "length");
  const width = num(values, "width");
  const depthIn = num(values, "depth", 4);
  const wastePct = num(values, "waste", planningDefaults.wasteGravel);
  const densityKey = str(values, "material", "100");
  const density = num(values, "density", 0) > 0
    ? num(values, "density")
    : Number(densityKey) || planningDefaults.gravelDensityLbPerCuFt;

  const pricePerYard = num(values, "pricePerYard", prices.gravelPerCubicYard);
  const pricePerTon = num(values, "pricePerTon", prices.gravelPerTon);

  const areaSqFt = length * width;
  const cubicFeet = areaSqFt * inchesToFeet(depthIn);
  const cubicYards = cubicFeetToYards(cubicFeet);

  const multiplier = wasteMultiplier(wastePct);
  const adjustedCuFt = cubicFeet * multiplier;
  const adjustedYards = cubicFeetToYards(adjustedCuFt);

  const orderStep = bulkPurchaseStep("volumeYd", unitSystem);
  const purchaseYards = roundUpTo(adjustedYards, orderStep);

  const pounds = adjustedCuFt * density;
  const tons = pounds / planningDefaults.poundsPerTon;
  const purchaseTons = roundUpTo(tons, bulkPurchaseStep("weight", unitSystem));

  const yardCost = costOf(purchaseYards, pricePerYard);
  const tonCost = costOf(purchaseTons, pricePerTon);

  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });
  const d = describeFor(unitSystem);
  const metric = unitSystem === "metric";
  /*
   * Density is the one figure here with a compound unit. 100 lb/cu ft is
   * 1,602 kg/m³ — the pounds and the cubic foot both have to convert, which is
   * exactly the kind of thing a hardcoded label gets wrong.
   */
  const densityLabel = metric
    ? `${roundTo((density * 0.45359237) / 0.028316846592, 0).toLocaleString("en-US")} kg per cubic metre`
    : `${roundTo(density, 0)} lb per cubic foot`;

  const materials: MaterialLine[] = [
    {
      id: "gravel",
      name: MATERIAL_NAMES[densityKey] ?? "Aggregate",
      quantity: purchaseYards,
      measure: "volumeYd",
      precision: 2,
      unitPrice: pricePerYard,
      unitPriceMeasure: "volumeYd" as const,
      cost: yardCost,
      searchTerm: `${MATERIAL_NAMES[densityKey] ?? "gravel"} delivery`,
      note: `Approximately ${fmt(purchaseTons, "weight", 2)} at the density assumed below.`,
    },
    ...(num(values, "fabricPrice", 0) > 0
      ? [
          {
            id: "fabric",
            name: "Geotextile / landscape fabric",
            quantity: Math.ceil(areaSqFt),
            measure: "area" as const,
            precision: 0,
            unitPrice: num(values, "fabricPrice", 0),
            unitPriceMeasure: "area" as const,
            cost: costOf(Math.ceil(areaSqFt), num(values, "fabricPrice", 0)),
            searchTerm: "geotextile fabric driveway",
          },
        ]
      : []),
  ];

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
      sublabel: `About ${fmt(tons, "weight", 2)} — order ${fmt(purchaseYards, "volumeYd", 2)}`,
    },
    summary: [
      { label: "Area", value: areaSqFt, measure: "area", precision: 0 },
      { label: "Depth", value: depthIn, measure: "inch", precision: 1 },
      { label: "Volume", value: cubicYards, measure: "volumeYd", precision: 2 },
      { label: "Waste allowance", value: wastePct, measure: "percent" },
      {
        label: "Recommended purchase",
        value: purchaseYards,
        measure: "volumeYd",
        precision: 2,
        emphasis: true,
      },
      {
        label: "Approximate weight",
        value: tons,
        measure: "weight",
        precision: 2,
        note: "Weight varies with moisture content and material.",
      },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "by-volume",
        name: `Priced by the ${d.unitName("volumeYd").replace(/s$/, "")}`,
        summary: "How most landscape suppliers sell smaller loads.",
        recommended: yardCost <= tonCost || tonCost === 0,
        rows: [
          { label: "Order", value: purchaseYards, measure: "volumeYd", precision: 2 },
          { label: "Estimated cost", value: yardCost, measure: "currency" },
        ],
        totalCost: yardCost,
      },
      {
        id: "by-weight",
        name: `Priced by the ${metric ? "tonne" : "ton"}`,
        summary: "How quarries and bulk deliveries usually price it.",
        recommended: tonCost > 0 && tonCost < yardCost,
        rows: [
          { label: "Order", value: purchaseTons, measure: "weight", precision: 2 },
          { label: "Estimated cost", value: tonCost, measure: "currency" },
        ],
        totalCost: tonCost,
      },
    ],
    explanation: [
      `${d.area(areaSqFt)} at ${d.inch(depthIn)} deep is ${d.volumeYd(cubicYards)} of material before waste.`,
      `With ${roundTo(wastePct, 1)}% for compaction and spillage, order ${fmt(purchaseYards, "volumeYd", 2)}.`,
      `At ${densityLabel} that is roughly ${d.weight(tons)}. Suppliers sell by volume or by weight, so it is worth pricing both.`,
    ],
    formulas: [
      {
        kind: "math",
        label: "Volume",
        expression: metric ? "Length × Width × Depth" : "Length × Width × (Depth ÷ 12)",
      },
      ...(metric
        ? []
        : [{ kind: "math" as const, label: "Cubic yards", expression: "Cubic feet ÷ 27" }]),
      {
        kind: "assumption",
        label: "Weight",
        expression: metric ? `Volume × ${densityLabel}` : `Cubic feet × ${roundTo(density, 0)} lb ÷ 2,000`,
      },
      { kind: "math", label: "Waste adjusted", expression: "Volume × (1 + Waste percentage)" },
    ],
    assumptions: [
      { label: "Material", value: MATERIAL_NAMES[densityKey] ?? "Aggregate" },
      { label: "Density", value: `${densityLabel} (dry, loose)` },
      { label: "Depth", value: d.inch(depthIn) },
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
    ],
    shoppingExtras: [
      shoppingItem("fabric", "Geotextile fabric under the gravel", undefined, true),
      shoppingItem("edging", "Edging to keep the gravel where you put it"),
      shoppingItem("rake", "Landscape rake"),
      shoppingItem("tamper", "Plate compactor or hand tamper", undefined, true),
      shoppingItem("wheelbarrow", "Wheelbarrow"),
    ],
    warnings: [
      "Aggregate weight varies significantly with moisture, gradation, and stone type. Treat the tonnage as an approximation and confirm with your supplier.",
      "Check that your driveway and any delivery route can take a loaded truck.",
    ],
    effort: {
      difficulty: "Easy",
      timeCategory: adjustedYards > 5 ? "A full day with help" : "A few hours",
      notes: [
        "Spreading is straightforward; moving it from the pile is the work.",
        "Compact in layers if it is going under something structural.",
      ],
    },
  };
}
