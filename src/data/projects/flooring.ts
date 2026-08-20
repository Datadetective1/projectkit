import { calculateFlooring } from "@/lib/calculations/flooring";
import { planningDefaults, prices } from "@/lib/pricing";
import type { NumberInput, ProjectDefinition } from "@/types/project";

function roomDimension(
  index: 1 | 2 | 3,
  axis: "length" | "width",
  defaultValue: number,
): NumberInput {
  return {
    id: `${axis}${index}`,
    type: "number",
    label: index === 1 ? `Room ${axis}` : `Area ${index} ${axis}`,
    measure: "length",
    defaultValue,
    min: 0.5,
    max: 500,
    step: 0.5,
    required: true,
    tier: "quick",
    showWhen: (values) => Number(values.roomCount) >= index,
  };
}

export const flooringProject: ProjectDefinition = {
  slug: "flooring-calculator",
  name: "Flooring",
  h1: "Flooring Calculator & Project Planner",
  category: "Interior",
  tagline: "Square footage, waste, boxes, and leftover material.",
  intro:
    "Measure up to three areas at once and get the number of boxes to buy, how much will be left over, and what the job costs at your price. Waste allowance is adjustable because a diagonal layout is not a straight one.",
  icon: "Grid2x2",
  accent: "oak",
  keywords: ["flooring", "floor", "laminate", "vinyl", "lvp", "hardwood", "plank"],

  inputs: [
    {
      id: "roomCount",
      type: "number",
      label: "Number of areas",
      help: "Measure each room or hallway separately for a more accurate total.",
      measure: "count",
      defaultValue: 1,
      min: 1,
      max: 3,
      step: 1,
      required: true,
      tier: "quick",
    },
    roomDimension(1, "length", 15),
    roomDimension(1, "width", 12),
    roomDimension(2, "length", 12),
    roomDimension(2, "width", 10),
    roomDimension(3, "length", 10),
    roomDimension(3, "width", 8),
    {
      id: "material",
      type: "select",
      label: "Material",
      defaultValue: "lvp",
      tier: "advanced",
      group: "Product",
      options: [
        { value: "lvp", label: "Luxury vinyl plank" },
        { value: "laminate", label: "Laminate" },
        { value: "engineered", label: "Engineered hardwood" },
        { value: "hardwood", label: "Solid hardwood" },
        { value: "tile", label: "Tile plank" },
      ],
    },
    {
      id: "waste",
      type: "number",
      label: "Waste allowance",
      help: "10% for a straight layout, 15%+ for diagonal or herringbone.",
      measure: "percent",
      defaultValue: planningDefaults.wasteFlooring,
      min: 0,
      max: 50,
      step: 1,
      allowZero: true,
      required: true,
      tier: "advanced",
      group: "Product",
    },
    {
      id: "sqFtPerBox",
      type: "number",
      label: "Square feet per box",
      measure: "area",
      unitOverride: "sq ft / box",
      defaultValue: 24,
      min: 1,
      max: 200,
      step: 0.01,
      required: true,
      tier: "advanced",
      group: "Product",
    },
    {
      id: "pricePerSqFt",
      type: "number",
      label: "Price per square foot",
      measure: "currency",
      perMeasure: "area",
      defaultValue: prices.flooringPerSqFt,
      min: 0,
      max: 100,
      step: 0.1,
      allowZero: true,
      tier: "advanced",
      group: "Pricing",
    },
    {
      id: "pricePerBox",
      type: "number",
      label: "Price per box",
      help: (d) =>
        `Optional. If set, this overrides the ${d.system === "us" ? "per-square-foot" : "per-square-metre"} price.`,
      measure: "currency",
      unitOverride: "$ / box",
      defaultValue: 0,
      min: 0,
      max: 2000,
      step: 1,
      allowZero: true,
      tier: "advanced",
      group: "Pricing",
    },
    {
      id: "underlaymentPrice",
      type: "number",
      label: "Underlayment price",
      help: "Leave at 0 if your flooring has attached underlayment.",
      measure: "currency",
      perMeasure: "area",
      defaultValue: 0,
      min: 0,
      max: 50,
      step: 0.05,
      allowZero: true,
      tier: "advanced",
      group: "Pricing",
    },
  ],

  calculate: calculateFlooring,

  steps: [
    "Let the flooring acclimate in the room for the manufacturer's stated period.",
    "Remove the old flooring and any tack strips or staples.",
    "Check the subfloor for flatness and fix low or high spots.",
    "Undercut door casings so planks slide underneath.",
    "Lay underlayment if your product needs it.",
    "Dry-lay the first few rows to plan the layout and stagger.",
    "Start along the longest straight wall with expansion spacers.",
    "Stagger end joints by at least the manufacturer's minimum.",
    "Cut the last row to width, leaving the expansion gap.",
    "Install transitions and reinstall or add shoe moulding.",
  ],

  faq: [
    {
      question: "How much extra flooring should I buy?",
      answer:
        "Ten percent is standard for a straight layout in a simple rectangular room. Go to fifteen percent for diagonal installs, herringbone, or rooms with lots of jogs and closets. Keep the leftovers — matching a discontinued run later is nearly impossible.",
    },
    {
      question: "How do I calculate flooring for an irregular room?",
      answer:
        "Break it into rectangles, measure each one, and add them together. This planner lets you enter up to three areas so you do not have to do that arithmetic yourself.",
    },
    {
      question: "Do I need underlayment?",
      answer:
        "Many vinyl and laminate products come with underlayment already attached — adding more can actually void the warranty. Check the product first. Over concrete you will usually need a moisture barrier regardless.",
    },
    {
      question: "Why does the box coverage matter so much?",
      answer:
        "Because flooring is sold whole boxes only. A room needing 262 sq ft with 24 sq ft boxes means 11 boxes and 264 sq ft, not 262. The rounding is where budget surprises come from.",
    },
  ],

  related: ["paint-calculator", "tile-calculator", "drywall-calculator"],

  seo: {
    title: "Flooring Calculator — Boxes, Waste & Cost",
    description:
      "Calculate flooring square footage across multiple rooms, waste allowance, number of boxes to buy, leftover material, and estimated cost.",
    breadcrumb: "Flooring",
  },
};
