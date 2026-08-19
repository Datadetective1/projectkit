import { formatQuantity, roundTo } from "@/lib/units";
import {
  bool,
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

const SHEET_LABELS: Record<string, string> = {
  "32": "4 × 8 ft",
  "40": "4 × 10 ft",
  "48": "4 × 12 ft",
};

/** Drywall sheets plus the accessories people forget to buy. */
export function calculateDrywall({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const length = num(values, "length");
  const width = num(values, "width");
  const height = num(values, "height", 8);
  const includeCeiling = bool(values, "includeCeiling", true);
  const doors = num(values, "doors", 1);
  const windows = num(values, "windows", 1);
  const outsideCorners = num(values, "outsideCorners", 0);
  const wastePct = num(values, "waste", planningDefaults.wasteDrywall);

  const sheetKey = str(values, "sheetSize", "32");
  const sheetArea = Number(sheetKey) || 32;
  const sheetPrice = num(values, "sheetPrice", prices.drywallSheet);
  const compoundPrice = num(values, "compoundPrice", prices.jointCompoundBucket);
  const tapePrice = num(values, "tapePrice", prices.drywallTapeRoll);
  const cornerBeadPrice = num(values, "cornerBeadPrice", prices.cornerBeadEach);

  const wallArea = 2 * (length + width) * height;
  const openings =
    doors * planningDefaults.doorAreaSqFt + windows * planningDefaults.windowAreaSqFt;
  const netWallArea = Math.max(wallArea - openings, 0);
  const ceilingArea = includeCeiling ? length * width : 0;
  const totalArea = netWallArea + ceilingArea;

  const adjustedArea = totalArea * wasteMultiplier(wastePct);
  const sheets = packagesNeeded(adjustedArea, sheetArea);

  const screws = Math.ceil(sheets * planningDefaults.drywallScrewsPerSheet);
  // Screws are sold by weight; a 1 lb box holds roughly 160 of the common size.
  const screwBoxes = Math.max(1, Math.ceil(screws / 160));

  const compoundLb = sheets * planningDefaults.drywallCompoundLbPerSheet;
  // A 4.5 gallon bucket of all-purpose compound is about 61 lb.
  const compoundBuckets = Math.max(1, packagesNeeded(compoundLb, 61));

  const tapeFt = sheets * planningDefaults.drywallTapeFtPerSheet;
  const tapeRolls = Math.max(1, packagesNeeded(tapeFt, 250));

  const cornerBeadPieces = outsideCorners > 0 ? Math.ceil((outsideCorners * height) / 8) : 0;

  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });
  const d = describeFor(unitSystem);
  /*
   * Sheet sizes stay imperial. "4 × 8 ft" is the product name you ask for, and
   * a metric reader hunting 1200 × 2400 mm board is better served by the label
   * on the stack than by 1.22 × 2.44 m. The fallback is a real area, so it
   * converts.
   */
  const sheetLabel = SHEET_LABELS[sheetKey] ?? d.area(sheetArea);

  const materials: MaterialLine[] = [
    {
      id: "sheets",
      name: `Drywall sheets (${sheetLabel})`,
      quantity: sheets,
      measure: "count",
      unitOverride: sheets === 1 ? "sheet" : "sheets",
      unitPrice: sheetPrice,
      unitPriceLabel: "per sheet",
      cost: costOf(sheets, sheetPrice),
      searchTerm: "drywall sheets",
      note: `Covers ${fmt(sheets * sheetArea, "area", 0)}.`,
    },
    {
      id: "screws",
      name: "Drywall screws",
      quantity: screwBoxes,
      measure: "count",
      unitOverride: screwBoxes === 1 ? "box (1 lb)" : "boxes (1 lb)",
      isEstimate: true,
      searchTerm: "drywall screws",
      note: `About ${screws} screws at ${planningDefaults.drywallScrewsPerSheet} per sheet.`,
    },
    {
      id: "compound",
      name: "Joint compound",
      quantity: compoundBuckets,
      measure: "count",
      unitOverride: compoundBuckets === 1 ? "bucket (4.5 gal)" : "buckets (4.5 gal)",
      unitPrice: compoundPrice,
      unitPriceLabel: "per bucket",
      cost: costOf(compoundBuckets, compoundPrice),
      isEstimate: true,
      searchTerm: "all purpose joint compound",
      note: `Allowance of about ${d.mass(planningDefaults.drywallCompoundLbPerSheet)} per sheet across three coats.`,
    },
    {
      id: "tape",
      name: "Joint tape",
      quantity: tapeRolls,
      measure: "count",
      unitOverride: tapeRolls === 1 ? "roll (250 ft)" : "rolls (250 ft)",
      unitPrice: tapePrice,
      unitPriceLabel: "per roll",
      cost: costOf(tapeRolls, tapePrice),
      isEstimate: true,
      searchTerm: "drywall joint tape",
      note: `About ${fmt(tapeFt, "length", 0)} of seams.`,
    },
    ...(cornerBeadPieces > 0
      ? [
          {
            id: "corner-bead",
            name: "Corner bead (8 ft)",
            quantity: cornerBeadPieces,
            measure: "count" as const,
            unitOverride: cornerBeadPieces === 1 ? "piece" : "pieces",
            unitPrice: cornerBeadPrice,
            unitPriceLabel: "each",
            cost: costOf(cornerBeadPieces, cornerBeadPrice),
            isEstimate: true,
            searchTerm: "drywall corner bead",
          },
        ]
      : []),
  ];

  const costTotal = sumCost(materials);
  const sheetsAt = (area: number) => packagesNeeded(adjustedArea, area);

  return {
    headline: {
      label: "You need approximately",
      value: sheets,
      measure: "count",
      unitOverride: sheets === 1 ? "sheet" : "sheets",
      sublabel: `${sheetLabel} drywall covering ${d.area(totalArea)}`,
    },
    summary: [
      { label: "Wall area (less openings)", value: netWallArea, measure: "area", precision: 0 },
      ...(includeCeiling
        ? [{ label: "Ceiling area", value: ceilingArea, measure: "area" as const, precision: 0 }]
        : []),
      { label: "Openings deducted", value: openings, measure: "area", precision: 0 },
      { label: "Waste allowance", value: wastePct, measure: "percent" },
      {
        label: "Sheets to buy",
        value: sheets,
        measure: "count",
        unitOverride: sheets === 1 ? "sheet" : "sheets",
        emphasis: true,
      },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "4x8",
        name: "4 × 8 sheets",
        summary: "Easiest to carry and fit through a doorway.",
        recommended: sheetKey === "32",
        rows: [{ label: "Sheets", value: sheetsAt(32), measure: "count", unitOverride: "sheets" }],
      },
      {
        id: "4x12",
        name: "4 × 12 sheets",
        summary: "Fewer butt joints to finish, much harder to handle alone.",
        recommended: sheetKey === "48",
        rows: [{ label: "Sheets", value: sheetsAt(48), measure: "count", unitOverride: "sheets" }],
      },
    ],
    explanation: [
      `Walls come to ${fmt(wallArea, "area", 0)} before openings. Taking out ${roundTo(doors, 0)} ${doors === 1 ? "door" : "doors"} and ${roundTo(windows, 0)} ${windows === 1 ? "window" : "windows"} leaves ${fmt(netWallArea, "area", 0)}${includeCeiling ? `, plus ${fmt(ceilingArea, "area", 0)} of ceiling` : ""}.`,
      `At ${roundTo(wastePct, 1)}% waste that is ${fmt(adjustedArea, "area", 0)} to cover, which is ${sheets} ${sheets === 1 ? "sheet" : "sheets"} of ${sheetLabel}.`,
      "Screw, compound, and tape quantities are trade rules of thumb rather than exact figures — finishing style changes compound usage more than anything else.",
    ],
    formulas: [
      { kind: "math", label: "Wall area", expression: "2 × (Length + Width) × Ceiling height" },
      { kind: "math", label: "Net area", expression: "Wall area − openings + ceiling" },
      { kind: "math", label: "Sheets", expression: "⌈(Net area × waste) ÷ Sheet area⌉" },
      {
        kind: "assumption",
        label: "Accessories",
        expression: `${planningDefaults.drywallScrewsPerSheet} screws, ${d.mass(planningDefaults.drywallCompoundLbPerSheet)} compound, and ${d.length(planningDefaults.drywallTapeFtPerSheet)} tape per sheet`,
      },
    ],
    assumptions: [
      { label: "Sheet size", value: sheetLabel },
      { label: "Ceiling included", value: includeCeiling ? "Yes" : "No" },
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
      { label: "Compound allowance", value: `${d.mass(planningDefaults.drywallCompoundLbPerSheet)} per sheet` },
    ],
    shoppingExtras: [
      shoppingItem("t-square", "Drywall T-square"),
      shoppingItem("knife", "Utility knife and spare blades"),
      shoppingItem("taping-knives", `Taping knives (${d.inchRange(6, 12)})`),
      shoppingItem("mud-pan", "Mud pan"),
      shoppingItem("sander", "Pole sander and sanding screens"),
      shoppingItem("lift", "Drywall lift rental for ceilings", undefined, !includeCeiling),
      shoppingItem("dust", "Dust masks and plastic sheeting"),
    ],
    warnings: [
      "Ceilings go up before walls, and a lift rental is worth it even for one room.",
      "Compound quantity depends heavily on finishing level and technique — buy the first bucket and judge from there.",
      "Sanding joint compound throws a lot of fine dust. Wear a fitted respirator rather than a paper mask, seal the doorway, and consider a wet sponge sander instead.",
    ],
    effort: {
      difficulty: "Challenging",
      timeCategory: "Several days including drying time between coats",
      notes: [
        "Hanging is fast. Taping, coating, and sanding is where the days go.",
        "Each compound coat needs to dry fully before the next.",
      ],
    },
  };
}
