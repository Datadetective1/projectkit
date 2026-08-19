import { formatQuantity, roundTo } from "@/lib/units";
import {
  costOf,
  num,
  packagesNeeded,
  shoppingItem,
  sumCost,
  wasteMultiplier,
} from "@/lib/calc/helpers";
import { describeFor } from "@/lib/calc/describe";
import { planningDefaults, prices } from "@/lib/pricing";
import type { CalculationContext, CalculationResult, MaterialLine } from "@/types/project";

/**
 * Tile: tiles, boxes, thinset, and grout.
 *
 * Grout uses the published industry formula
 *   lb/sq ft = [(A + B) ÷ (A × B)] × C × D × 9.5
 * where A and B are the tile dimensions in inches, C is the joint width and D
 * the tile thickness. It is an estimate — coverage varies by grout product.
 */

/**
 * Thinset coverage depends on the notch size, and notch size depends on tile
 * size — a large-format tile can use twice the mortar per square foot that a
 * small tile does. Returns coverage in sq ft per 50 lb bag, plus the trowel it
 * assumes, so the result page can say which one.
 */
function thinsetCoverage(tileLength: number, tileWidth: number) {
  const longestEdge = Math.max(tileLength, tileWidth);
  if (longestEdge <= planningDefaults.thinsetSmallTileMaxIn) {
    return { coverage: planningDefaults.thinsetCoverageSmallTile, trowel: "1/4 × 1/4 in notch" };
  }
  if (longestEdge >= planningDefaults.thinsetLargeFormatMinIn) {
    return { coverage: planningDefaults.thinsetCoverageLargeFormat, trowel: "1/2 × 1/2 in notch" };
  }
  return { coverage: planningDefaults.thinsetCoverageStandardTile, trowel: "1/4 × 3/8 in notch" };
}

export function calculateTile({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const length = num(values, "length");
  const width = num(values, "width");
  const tileLength = Math.max(num(values, "tileLength", 12), 0.25);
  const tileWidth = Math.max(num(values, "tileWidth", 12), 0.25);
  const tileThickness = Math.max(num(values, "tileThickness", 0.375), 0.05);
  const jointWidth = Math.max(num(values, "jointWidth", 0.1875), 0.01);
  const wastePct = num(values, "waste", planningDefaults.wasteTile);
  const sqFtPerBox = Math.max(num(values, "sqFtPerBox", 15), 0.01);
  const pricePerBox = num(values, "pricePerBox", 0);
  const pricePerSqFt = num(values, "pricePerSqFt", prices.tilePerSqFt);
  const thinsetPrice = num(values, "thinsetPrice", prices.thinsetBag50lb);
  const groutPrice = num(values, "groutPrice", prices.groutBag25lb);

  const areaSqFt = length * width;
  const multiplier = wasteMultiplier(wastePct);
  const adjustedArea = areaSqFt * multiplier;

  const tileAreaSqFt = (tileLength * tileWidth) / 144;
  const tilesExact = areaSqFt / tileAreaSqFt;
  const tilesAdjusted = Math.ceil(adjustedArea / tileAreaSqFt);

  const boxes = packagesNeeded(adjustedArea, sqFtPerBox);
  const coverage = boxes * sqFtPerBox;

  const thinset = thinsetCoverage(tileLength, tileWidth);
  const thinsetBags = Math.max(1, packagesNeeded(adjustedArea, thinset.coverage));

  const groutLbPerSqFt =
    ((tileLength + tileWidth) / (tileLength * tileWidth)) *
    jointWidth *
    tileThickness *
    9.5;
  const groutLb = groutLbPerSqFt * adjustedArea;
  const groutBags = Math.max(1, packagesNeeded(groutLb, 25));

  const tileCost =
    pricePerBox > 0 ? costOf(boxes, pricePerBox) : costOf(coverage, pricePerSqFt);

  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });
  const d = describeFor(unitSystem);
  const metric = unitSystem === "metric";
  // Tile is described by its face dimensions everywhere it appears.
  const tileSize = `${d.inch(tileLength, 1)} × ${d.inch(tileWidth, 1)}`;

  const materials: MaterialLine[] = [
    {
      id: "tile",
      name: `Tile ${tileSize} (${d.area(sqFtPerBox, 2)} per box)`,
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
      cost: tileCost,
      searchTerm: "floor tile",
      note: `About ${tilesAdjusted} tiles, covering ${fmt(coverage, "area", 0)}.`,
    },
    {
      id: "thinset",
      name: "Thinset mortar (50 lb)",
      quantity: thinsetBags,
      measure: "count",
      unitOverride: thinsetBags === 1 ? "bag" : "bags",
      unitPrice: thinsetPrice,
      unitPriceLabel: "per bag",
      cost: costOf(thinsetBags, thinsetPrice),
      isEstimate: true,
      searchTerm: "thinset mortar",
      note: `About ${fmt(thinset.coverage, "area", 0)} per bag with a ${thinset.trowel}, the size this tile calls for.`,
    },
    {
      id: "grout",
      name: "Grout (25 lb)",
      quantity: groutBags,
      measure: "count",
      unitOverride: groutBags === 1 ? "bag" : "bags",
      unitPrice: groutPrice,
      unitPriceLabel: "per bag",
      cost: costOf(groutBags, groutPrice),
      isEstimate: true,
      searchTerm: "tile grout",
      note: `About ${d.mass(groutLb, 1)} for ${d.inch(jointWidth, 2)} joints.`,
    },
    {
      id: "spacers",
      name: "Tile spacers",
      quantity: Math.max(1, Math.ceil(tilesAdjusted / 100)),
      measure: "count",
      unitOverride: "bags",
      isEstimate: true,
      searchTerm: "tile spacers",
    },
  ];

  const costTotal = sumCost(materials);
  return {
    headline: {
      label: "You need approximately",
      value: boxes,
      measure: "count",
      unitOverride: boxes === 1 ? "box of tile" : "boxes of tile",
      sublabel: `${tilesAdjusted} tiles including ${roundTo(wastePct, 1)}% waste, covering ${d.area(areaSqFt)}`,
    },
    summary: [
      { label: "Area to tile", value: areaSqFt, measure: "area", precision: 0 },
      { label: "Tile size", value: tileAreaSqFt, measure: "area", precision: 2, note: tileSize },
      { label: "Tiles before waste", value: Math.ceil(tilesExact), measure: "count", unitOverride: "tiles" },
      { label: "Waste allowance", value: wastePct, measure: "percent" },
      {
        label: "Tiles to buy",
        value: tilesAdjusted,
        measure: "count",
        unitOverride: "tiles",
        emphasis: true,
      },
      { label: "Boxes", value: boxes, measure: "count", unitOverride: boxes === 1 ? "box" : "boxes" },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "straight",
        name: "Straight lay (10% waste)",
        summary: "Grid pattern in a simple rectangular room.",
        recommended: wastePct <= 12,
        rows: [
          {
            label: "Boxes",
            value: packagesNeeded(areaSqFt * 1.1, sqFtPerBox),
            measure: "count",
            unitOverride: "boxes",
          },
        ],
      },
      {
        id: "diagonal",
        name: "Diagonal or herringbone (15% waste)",
        summary: "Every edge tile is a cut, and cuts create offcuts.",
        recommended: wastePct > 12,
        rows: [
          {
            label: "Boxes",
            value: packagesNeeded(areaSqFt * 1.15, sqFtPerBox),
            measure: "count",
            unitOverride: "boxes",
          },
        ],
      },
    ],
    explanation: [
      `${d.area(areaSqFt)} of floor at ${tileSize} per tile works out to about ${Math.ceil(tilesExact)} tiles before waste.`,
      `Adding ${roundTo(wastePct, 1)}% for cuts and breakage brings it to ${tilesAdjusted} tiles, which is ${boxes} ${boxes === 1 ? "box" : "boxes"}.`,
      "Buy every box from the same production lot. Colour and size vary between lots enough to see across a floor.",
    ],
    formulas: [
      { kind: "math", label: "Area", expression: "Length × Width" },
      {
        kind: "math",
        label: "Tile area",
        expression: metric
          ? "(Tile length × Tile width) ÷ 10,000"
          : "(Tile length × Tile width) ÷ 144",
      },
      { kind: "math", label: "Tiles", expression: "⌈(Area × waste) ÷ Tile area⌉" },
      {
        kind: "assumption",
        label: "Grout",
        // The published formula is stated in imperial and only holds in it; the
        // result is converted, so metric says which units go in.
        expression: metric
          ? "[(A + B) ÷ (A × B)] × Joint width × Tile thickness × 9.5, with A, B, and thickness in inches"
          : "[(A + B) ÷ (A × B)] × Joint width × Tile thickness × 9.5 lb per sq ft",
      },
      {
        kind: "assumption",
        label: "Thinset",
        expression: `${d.area(thinset.coverage)} per 50 lb bag (${thinset.trowel})`,
      },
    ],
    assumptions: [
      { label: "Waste allowance", value: `${roundTo(wastePct, 1)}%` },
      { label: "Grout joint", value: d.inch(jointWidth, 2) },
      { label: "Tile thickness", value: d.inch(tileThickness, 2) },
      { label: "Box coverage", value: d.area(sqFtPerBox, 2) },
    ],
    shoppingExtras: [
      shoppingItem("trowel", "Notched trowel sized for your tile"),
      shoppingItem("wet-saw", "Wet saw or tile cutter (rental is fine)"),
      shoppingItem("float", "Grout float"),
      shoppingItem("sponges", "Grout sponges and buckets"),
      shoppingItem("sealer", "Grout sealer", undefined, true),
      shoppingItem("backer", "Cement backer board and screws", undefined, true),
      shoppingItem("membrane", "Waterproofing membrane for wet areas", undefined, true),
    ],
    warnings: [
      "Wet areas need proper waterproofing under the tile — that is a system, not an add-on.",
      "Grout and thinset coverage vary by product, trowel size, and substrate. Treat these as allowances.",
    ],
    effort: {
      difficulty: "Challenging",
      timeCategory: "Two to three days including cure and grout time",
      notes: [
        "Layout planning decides whether the room looks professional.",
        "Thinset has a working time — mix small batches.",
      ],
    },
  };
}
