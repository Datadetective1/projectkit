import { formatQuantity, roundTo, roundUpTo } from "@/lib/units";
import {
  bool,
  costOf,
  num,
  shoppingItem,
  sumCost,
} from "@/lib/calc/helpers";
import { planningDefaults, prices } from "@/lib/pricing";
import type { CalculationContext, CalculationResult, MaterialLine } from "@/types/project";

/** Interior paint: wall area less openings, coats, primer, and cost. */
export function calculatePaint({
  values,
  unitSystem,
}: CalculationContext): CalculationResult {
  const length = num(values, "length");
  const width = num(values, "width");
  const height = num(values, "height", 8);
  const coats = Math.max(num(values, "coats", 2), 1);
  const rooms = Math.max(num(values, "rooms", 1), 1);

  const doors = num(values, "doors", 1);
  const windows = num(values, "windows", 2);
  const includeCeiling = bool(values, "includeCeiling", false);
  const includeTrim = bool(values, "includeTrim", false);
  const includePrimer = bool(values, "includePrimer", false);

  const coverage = Math.max(
    num(values, "coverage", planningDefaults.paintCoverageSqFtPerGallon),
    1,
  );
  const primerCoverage = Math.max(
    num(values, "primerCoverage", planningDefaults.primerCoverageSqFtPerGallon),
    1,
  );
  const pricePerGallon = num(values, "paintPrice", prices.paintPerGallon);
  const primerPrice = num(values, "primerPrice", prices.primerPerGallon);

  const perRoomWallArea = 2 * (length + width) * height;
  const perRoomCeilingArea = length * width;
  const openingsArea =
    doors * planningDefaults.doorAreaSqFt + windows * planningDefaults.windowAreaSqFt;

  const wallArea = Math.max(perRoomWallArea - openingsArea, 0) * rooms;
  const ceilingArea = includeCeiling ? perRoomCeilingArea * rooms : 0;
  // Trim is roughly the perimeter at baseboard plus door and window casing.
  const trimArea = includeTrim
    ? (2 * (length + width) * 0.5 + doors * 20 + windows * 12) * rooms
    : 0;

  const paintableArea = wallArea + ceilingArea;
  const gallonsExact = (paintableArea * coats) / coverage;
  // Paint is sold in gallons and quarts; a quart is a quarter gallon.
  const gallonsPurchase = roundUpTo(gallonsExact, 0.25);
  const wholeGallons = Math.floor(gallonsPurchase);
  const quarts = Math.round((gallonsPurchase - wholeGallons) * 4);

  const primerGallonsExact = includePrimer ? paintableArea / primerCoverage : 0;
  const primerPurchase = includePrimer ? roundUpTo(primerGallonsExact, 0.25) : 0;

  const trimGallonsExact = includeTrim ? (trimArea * coats) / coverage : 0;
  const trimPurchase = includeTrim ? roundUpTo(trimGallonsExact, 0.25) : 0;

  const materials: MaterialLine[] = [
    {
      id: "paint",
      name: "Wall paint",
      quantity: gallonsPurchase,
      measure: "count",
      unitOverride: gallonsPurchase === 1 ? "gallon" : "gallons",
      precision: 2,
      unitPrice: pricePerGallon,
      unitPriceLabel: "per gallon",
      cost: costOf(gallonsPurchase, pricePerGallon),
      searchTerm: "interior wall paint",
      note:
        quarts > 0
          ? `Buy ${wholeGallons} ${wholeGallons === 1 ? "gallon" : "gallons"} plus ${quarts} ${quarts === 1 ? "quart" : "quarts"}.`
          : undefined,
    },
    ...(includePrimer
      ? [
          {
            id: "primer",
            name: "Primer",
            quantity: primerPurchase,
            measure: "count" as const,
            unitOverride: primerPurchase === 1 ? "gallon" : "gallons",
            precision: 2,
            unitPrice: primerPrice,
            unitPriceLabel: "per gallon",
            cost: costOf(primerPurchase, primerPrice),
            searchTerm: "interior primer",
            note: "One coat over the full wall area.",
          },
        ]
      : []),
    ...(includeTrim
      ? [
          {
            id: "trim-paint",
            name: "Trim & door paint",
            quantity: trimPurchase,
            measure: "count" as const,
            unitOverride: trimPurchase === 1 ? "gallon" : "gallons",
            precision: 2,
            unitPrice: pricePerGallon,
            unitPriceLabel: "per gallon",
            cost: costOf(trimPurchase, pricePerGallon),
            searchTerm: "trim enamel paint",
            isEstimate: true,
            note: "Trim area is an allowance based on room perimeter and openings.",
          },
        ]
      : []),
    {
      id: "tape",
      name: "Painter's tape",
      quantity: Math.max(1, Math.ceil((2 * (length + width) * rooms) / 60)),
      measure: "count",
      unitOverride: "rolls",
      isEstimate: true,
      searchTerm: "painters tape",
    },
    {
      id: "rollers",
      name: "Roller covers",
      quantity: Math.max(2, Math.ceil(gallonsPurchase)),
      measure: "count",
      unitOverride: "covers",
      isEstimate: true,
      searchTerm: "paint roller covers",
    },
  ];

  const costTotal = sumCost(materials);
  const fmt = (value: number, measure: Parameters<typeof formatQuantity>[1], precision?: number) =>
    formatQuantity(value, measure, { system: unitSystem, precision });

  return {
    headline: {
      label: "You need approximately",
      value: gallonsPurchase,
      measure: "count",
      precision: 2,
      unitOverride: gallonsPurchase === 1 ? "gallon of paint" : "gallons of paint",
      sublabel: `${coats} ${coats === 1 ? "coat" : "coats"} over ${fmt(paintableArea, "area", 0)} of paintable surface`,
    },
    summary: [
      { label: "Wall area (less openings)", value: wallArea, measure: "area", precision: 0 },
      ...(includeCeiling
        ? [{ label: "Ceiling area", value: ceilingArea, measure: "area" as const, precision: 0 }]
        : []),
      { label: "Openings deducted", value: openingsArea * rooms, measure: "area", precision: 0 },
      { label: "Coats", value: coats, measure: "count", unitOverride: coats === 1 ? "coat" : "coats" },
      {
        label: "Paint needed (exact)",
        value: gallonsExact,
        measure: "count",
        precision: 2,
        unitOverride: "gallons",
      },
      {
        label: "Recommended purchase",
        value: gallonsPurchase,
        measure: "count",
        precision: 2,
        unitOverride: "gallons",
        emphasis: true,
      },
    ],
    materials,
    costTotal,
    scenarios: [
      {
        id: "one-coat",
        name: "One coat",
        summary: "Only realistic over a similar existing colour in good condition.",
        recommended: coats === 1,
        rows: [
          {
            label: "Paint",
            value: roundUpTo(paintableArea / coverage, 0.25),
            measure: "count",
            precision: 2,
            unitOverride: "gallons",
          },
        ],
      },
      {
        id: "two-coat",
        name: "Two coats",
        summary: "The normal expectation for an even finish.",
        recommended: coats >= 2,
        rows: [
          {
            label: "Paint",
            value: roundUpTo((paintableArea * 2) / coverage, 0.25),
            measure: "count",
            precision: 2,
            unitOverride: "gallons",
          },
        ],
      },
    ],
    explanation: [
      `${rooms > 1 ? `${roundTo(rooms, 0)} rooms of ` : ""}${roundTo(length, 1)} × ${roundTo(width, 1)} at ${roundTo(height, 1)} ft ceilings gives ${fmt(wallArea, "area", 0)} of wall after taking out ${roundTo(doors, 0)} ${doors === 1 ? "door" : "doors"} and ${roundTo(windows, 0)} ${windows === 1 ? "window" : "windows"}.`,
      `At ${roundTo(coverage, 0)} sq ft per gallon and ${coats} ${coats === 1 ? "coat" : "coats"}, that is ${roundTo(gallonsExact, 2)} gallons of actual paint. Rounded up to what you can buy: ${roundTo(gallonsPurchase, 2)} gallons.`,
      "Coverage on the can is measured on smooth, primed, similar-coloured wall. Textured walls, deep colour changes, and fresh drywall all drink noticeably more.",
    ],
    formulas: [
      { kind: "math", label: "Wall area", expression: "2 × (Length + Width) × Ceiling height" },
      {
        kind: "math",
        label: "Openings",
        expression: `Doors × ${planningDefaults.doorAreaSqFt} sq ft + Windows × ${planningDefaults.windowAreaSqFt} sq ft`,
      },
      { kind: "math", label: "Paint", expression: "(Paintable area × Coats) ÷ Coverage per gallon" },
      { kind: "assumption", label: "Purchase rounding", expression: "Rounded up to the next quart" },
    ],
    assumptions: [
      { label: "Coverage", value: `${roundTo(coverage, 0)} sq ft per gallon` },
      { label: "Standard door", value: `${planningDefaults.doorAreaSqFt} sq ft` },
      { label: "Standard window", value: `${planningDefaults.windowAreaSqFt} sq ft` },
      { label: "Ceiling included", value: includeCeiling ? "Yes" : "No" },
      { label: "Primer included", value: includePrimer ? "Yes, one coat" : "No" },
    ],
    shoppingExtras: [
      shoppingItem("brushes", "Angled sash brush (2–2.5 in)"),
      shoppingItem("frame", "Roller frame and extension pole"),
      shoppingItem("tray", "Paint tray and liners"),
      shoppingItem("drop", "Drop cloths"),
      shoppingItem("spackle", "Spackle and a putty knife for nail holes"),
      shoppingItem("sandpaper", "Fine sanding sponge"),
      shoppingItem("caulk", "Paintable caulk", undefined, true),
    ],
    warnings: [
      "Homes built before 1978 may contain lead paint. Do not sand or scrape without checking first.",
      "Buy all of one colour in a single trip so the batch matches.",
    ],
    effort: {
      difficulty: "Easy",
      timeCategory: rooms > 2 ? "A long weekend" : "One to two days",
      notes: [
        "Prep and cutting in takes longer than rolling.",
        "Most of the quality comes from patching, sanding, and taping properly.",
      ],
    },
  };
}
