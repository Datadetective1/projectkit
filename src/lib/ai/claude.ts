import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { projectSlugs } from "@/data/projects";
import type { ParsedProject } from "./parseProject";

/**
 * Optional AI-assisted parameter extraction.
 *
 * This layer never calculates anything. It reads a sentence, proposes a project
 * and a set of numeric parameters, and hands them to the deterministic engine —
 * which is the only thing that produces a number the user ever sees.
 *
 * Every field of the model's response is validated against a schema before it
 * is trusted, and any failure falls back silently to the rules parser.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

/** Parameters the model is allowed to extract. Anything else is ignored. */
const PARAMETER_NAMES = [
  "length",
  "width",
  "height",
  "thickness",
  "depth",
  "area",
  "diameter",
  "runLength",
  "gateCount",
  "gateWidth",
  "rooms",
  "doors",
  "windows",
  "coats",
  "tileLength",
  "tileWidth",
] as const;

type ParameterName = (typeof PARAMETER_NAMES)[number];

/**
 * Maps the generic parameter vocabulary onto each project's input ids.
 * A parameter with no mapping for the chosen project is dropped.
 */
const FIELD_MAP: Record<string, Partial<Record<ParameterName, string>>> = {
  "concrete-calculator": { length: "length", width: "width", thickness: "thickness" },
  "fence-calculator": {
    length: "length",
    width: "width",
    height: "height",
    runLength: "runLength",
    gateCount: "gateCount",
    gateWidth: "gateWidth",
  },
  "paint-calculator": {
    length: "length",
    width: "width",
    height: "height",
    rooms: "rooms",
    doors: "doors",
    windows: "windows",
    coats: "coats",
  },
  "flooring-calculator": { length: "length1", width: "width1" },
  "mulch-calculator": {
    length: "length",
    width: "width",
    depth: "depth",
    area: "area",
    diameter: "diameter",
  },
  "gravel-calculator": { length: "length", width: "width", depth: "depth" },
  "drywall-calculator": {
    length: "length",
    width: "width",
    height: "height",
    doors: "doors",
    windows: "windows",
  },
  "tile-calculator": {
    length: "length",
    width: "width",
    tileLength: "tileLength",
    tileWidth: "tileWidth",
  },
  "deck-calculator": { length: "length", width: "width", height: "height" },
  "sod-calculator": { length: "length", width: "width", area: "extraArea" },
};

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["project", "confidence", "parameters"],
  properties: {
    project: {
      type: "string",
      enum: [...projectSlugs(), "unknown"],
      description: "The ProjectKit planner that best matches the request.",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How confident you are that this is the right project.",
    },
    parameters: {
      type: "array",
      description:
        "Numeric values explicitly stated in the request. Never estimate or invent a value.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "value"],
        properties: {
          name: { type: "string", enum: [...PARAMETER_NAMES] },
          value: { type: "number" },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `You extract structured planning parameters from a homeowner's description of a home-improvement project.

Rules:
- Choose the single ProjectKit planner that best matches the request. If nothing fits, use "unknown".
- Only report numbers the person actually stated. Never estimate, infer, or fill in a typical value — a missing parameter is far better than a wrong one.
- Lengths and widths are in feet. Thickness and depth are in inches. Area is in square feet. Counts are whole numbers.
- "20 by 16" means length 20 and width 16.
- Never perform arithmetic. Report the stated numbers, nothing derived from them.`;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface RawResponse {
  project: string;
  confidence: "high" | "medium" | "low";
  parameters: { name: string; value: number }[];
}

function isRawResponse(value: unknown): value is RawResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.project !== "string") return false;
  if (!["high", "medium", "low"].includes(record.confidence as string)) return false;
  if (!Array.isArray(record.parameters)) return false;
  return record.parameters.every((item) => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    return typeof entry.name === "string" && typeof entry.value === "number";
  });
}

/**
 * Ask Claude to extract parameters. Returns undefined on any failure — the
 * caller falls back to the deterministic parser, which always works.
 */
export async function parseWithAi(input: string): Promise<ParsedProject | undefined> {
  if (!isAiConfigured()) return undefined;
  const text = input.trim().slice(0, 400);
  if (!text) return undefined;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        output_config: {
          format: { type: "json_schema", schema: RESPONSE_SCHEMA },
        },
        messages: [{ role: "user", content: text }],
      },
      { timeout: 12_000 },
    );

    const block = response.content.find((item) => item.type === "text");
    if (!block || block.type !== "text") return undefined;

    const parsed: unknown = JSON.parse(block.text);
    if (!isRawResponse(parsed)) return undefined;
    if (parsed.project === "unknown") return undefined;

    const fieldMap = FIELD_MAP[parsed.project];
    if (!fieldMap) return undefined;

    const fields: Record<string, string> = {};
    const interpretation: string[] = [];

    for (const parameter of parsed.parameters) {
      const target = fieldMap[parameter.name as ParameterName];
      if (!target) continue;
      if (!Number.isFinite(parameter.value) || parameter.value < 0) continue;
      if (parameter.value > 100_000) continue;
      fields[target] = String(parameter.value);
      interpretation.push(`${parameter.name} ${parameter.value}`);
    }

    if (Object.keys(fields).length === 0) return undefined;

    // A fence described by yard dimensions needs the enclosed layout selected.
    if (parsed.project === "fence-calculator" && fields.length && fields.width) {
      fields.layout = "rectangle";
    }
    if (parsed.project === "mulch-calculator") {
      if (fields.area) fields.shape = "custom";
      else if (fields.diameter) fields.shape = "circle";
      else if (fields.length) fields.shape = "rectangle";
    }

    return {
      slug: parsed.project,
      fields,
      confidence: parsed.confidence,
      interpretation,
      source: "ai",
    };
  } catch {
    // Any AI failure — network, quota, malformed output — degrades to rules.
    return undefined;
  }
}
