import { projects } from "@/data/projects";

/**
 * Deterministic natural-language project parser.
 *
 * This runs first and runs always. It is plain pattern matching — no model, no
 * network, no cost — and it handles the overwhelming majority of real phrasings
 * ("a 20 by 16 concrete patio", "6 ft privacy fence with one gate").
 *
 * The AI layer in ./claude.ts is only consulted when this cannot identify a
 * project or finds no numbers, and its output is validated before use. Nothing
 * here or there ever performs arithmetic — it only extracts parameters that the
 * deterministic calculation engine then uses.
 */

export interface ParsedProject {
  slug: string;
  /** Field id → value, ready to be passed to the planner as query params. */
  fields: Record<string, string>;
  confidence: "high" | "medium" | "low";
  /** Human-readable summary of what was understood. */
  interpretation: string[];
  source: "rules" | "ai";
}

export interface ParseResult {
  ok: boolean;
  parsed?: ParsedProject;
  /** Candidate projects when the request was ambiguous. */
  candidates: string[];
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  a: 1,
  an: 1,
};

function toNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/,/g, "").trim().toLowerCase();
  if (cleaned in NUMBER_WORDS) return NUMBER_WORDS[cleaned];
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/* ------------------------------------------------------------ extractors -- */

const NUM = "\\d[\\d,]*(?:\\.\\d+)?";
const WORD_NUM = Object.keys(NUMBER_WORDS).join("|");

function extractDimensions(text: string): { length: number; width: number } | undefined {
  const match = text.match(
    new RegExp(
      `(${NUM})\\s*(?:'|’|ft\\b|feet\\b|foot\\b|m\\b|meters?\\b)?\\s*(?:x|×|by)\\s*(${NUM})\\s*(?:'|’|ft\\b|feet\\b|foot\\b|m\\b|meters?\\b)?`,
      "i",
    ),
  );
  if (!match) return undefined;
  const length = toNumber(match[1]);
  const width = toNumber(match[2]);
  if (length === undefined || width === undefined) return undefined;
  return { length, width };
}

function extractArea(text: string): number | undefined {
  const match = text.match(
    new RegExp(`(${NUM})\\s*(?:sq\\.?\\s*(?:ft|feet)|square\\s*(?:ft|feet|foot))`, "i"),
  );
  return toNumber(match?.[1]);
}

function extractFenceHeight(text: string): number | undefined {
  const match = text.match(
    new RegExp(`(${NUM}|${WORD_NUM})[\\s-]*(?:'|’|ft\\b|feet\\b|foot\\b)[\\s-]*(?:tall\\s+)?(?=.*fenc)`, "i"),
  );
  if (match) return toNumber(match[1]);
  const tall = text.match(new RegExp(`(${NUM})[\\s-]*(?:'|’|ft|feet|foot)[\\s-]*(?:tall|high)`, "i"));
  return toNumber(tall?.[1]);
}

function extractInches(text: string, keywords: string[]): number | undefined {
  for (const keyword of keywords) {
    const match = text.match(
      new RegExp(`(${NUM})\\s*(?:in\\b|inch(?:es)?|")\\s*(?:${keyword})`, "i"),
    );
    const value = toNumber(match?.[1]);
    if (value !== undefined) return value;
  }
  const generic = text.match(new RegExp(`(${NUM})\\s*(?:in\\b|inch(?:es)?|")`, "i"));
  return toNumber(generic?.[1]);
}

function extractCount(text: string, noun: string): number | undefined {
  const match = text.match(new RegExp(`(${NUM}|${WORD_NUM})\\s+${noun}s?\\b`, "i"));
  return toNumber(match?.[1]);
}

function extractLinearFeet(text: string): number | undefined {
  const match = text.match(
    new RegExp(`(${NUM})\\s*(?:linear\\s*)?(?:ft\\b|feet\\b|foot\\b)\\s*(?:of\\s+)?fenc`, "i"),
  );
  return toNumber(match?.[1]);
}

function extractTileSize(text: string): { length: number; width: number } | undefined {
  const match = text.match(new RegExp(`(${NUM})\\s*(?:x|×|by)\\s*(${NUM})\\s*(?:in\\b|inch(?:es)?|")?\\s*tiles?`, "i"));
  if (!match) return undefined;
  const length = toNumber(match[1]);
  const width = toNumber(match[2]);
  if (length === undefined || width === undefined) return undefined;
  return { length, width };
}

/* -------------------------------------------------------- project picker -- */

/** Words that pick a project decisively, ahead of generic keyword scoring. */
const STRONG_SIGNALS: { slug: string; patterns: RegExp[] }[] = [
  { slug: "concrete-calculator", patterns: [/\bconcrete\b/i, /\bcement\b/i, /\bslab\b/i] },
  { slug: "fence-calculator", patterns: [/\bfenc\w*/i] },
  { slug: "paint-calculator", patterns: [/\bpaint\w*/i, /\brepaint\w*/i] },
  { slug: "flooring-calculator", patterns: [/\bfloor\w*/i, /\blaminate\b/i, /\bvinyl plank\b/i, /\blvp\b/i, /\bhardwood\b/i] },
  { slug: "mulch-calculator", patterns: [/\bmulch\b/i, /\bbark\b/i] },
  { slug: "gravel-calculator", patterns: [/\bgravel\b/i, /\bcrushed stone\b/i, /\bpea gravel\b/i, /\baggregate\b/i] },
  { slug: "drywall-calculator", patterns: [/\bdrywall\b/i, /\bsheetrock\b/i, /\bplasterboard\b/i] },
  { slug: "tile-calculator", patterns: [/\btiles?\b/i, /\btiling\b/i, /\bbacksplash\b/i] },
  { slug: "deck-calculator", patterns: [/\bdeck\w*/i] },
  { slug: "sod-calculator", patterns: [/\bsod\b/i, /\bturf\b/i, /\bnew lawn\b/i] },
];

function detectProject(text: string): { slug?: string; candidates: string[] } {
  const hits = STRONG_SIGNALS.filter((signal) =>
    signal.patterns.some((pattern) => pattern.test(text)),
  ).map((signal) => signal.slug);

  if (hits.length === 1) return { slug: hits[0], candidates: hits };
  if (hits.length > 1) {
    // "concrete patio and a fence" — take the first mentioned, offer the rest.
    const positions = hits.map((slug) => {
      const signal = STRONG_SIGNALS.find((item) => item.slug === slug);
      const index = signal?.patterns
        .map((pattern) => text.search(pattern))
        .filter((value) => value >= 0)
        .sort((a, b) => a - b)[0];
      return { slug, index: index ?? Number.MAX_SAFE_INTEGER };
    });
    positions.sort((a, b) => a.index - b.index);
    return { slug: positions[0].slug, candidates: positions.map((item) => item.slug) };
  }

  // Fall back to the definitions' own keyword lists.
  const scored = projects
    .map((project) => ({
      slug: project.slug,
      score: project.keywords.filter((keyword) =>
        new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text),
      ).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { candidates: [] };
  return { slug: scored[0].slug, candidates: scored.map((item) => item.slug) };
}

/* ------------------------------------------------------------ field maps -- */

function buildFields(slug: string, text: string): { fields: Record<string, string>; notes: string[] } {
  const fields: Record<string, string> = {};
  const notes: string[] = [];
  const dims = extractDimensions(text);
  const area = extractArea(text);

  const setDims = (lengthId: string, widthId: string) => {
    if (!dims) return;
    fields[lengthId] = String(dims.length);
    fields[widthId] = String(dims.width);
    notes.push(`${dims.length} × ${dims.width} ft`);
  };

  switch (slug) {
    case "concrete-calculator": {
      setDims("length", "width");
      const thickness = extractInches(text, ["thick", "slab"]);
      if (thickness !== undefined) {
        fields.thickness = String(thickness);
        notes.push(`${thickness} in thick`);
      }
      break;
    }
    case "fence-calculator": {
      const linear = extractLinearFeet(text);
      if (dims) {
        fields.layout = "rectangle";
        setDims("length", "width");
      } else if (linear !== undefined) {
        fields.layout = "straight";
        fields.runLength = String(linear);
        notes.push(`${linear} ft of fence`);
      }
      const height = extractFenceHeight(text);
      if (height !== undefined) {
        fields.height = String(height);
        notes.push(`${height} ft high`);
      }
      const gates = extractCount(text, "gate");
      if (gates !== undefined) {
        fields.gateCount = String(gates);
        notes.push(`${gates} ${gates === 1 ? "gate" : "gates"}`);
      }
      if (/privacy/i.test(text)) {
        fields.picketGap = "0";
        notes.push("privacy style (no picket gap)");
      }
      break;
    }
    case "paint-calculator": {
      setDims("length", "width");
      const rooms =
        extractCount(text, "bedroom") ?? extractCount(text, "room") ?? undefined;
      if (rooms !== undefined) {
        fields.rooms = String(rooms);
        notes.push(`${rooms} ${rooms === 1 ? "room" : "rooms"}`);
      }
      if (/ceiling/i.test(text)) {
        fields.includeCeiling = "true";
        notes.push("ceilings included");
      }
      break;
    }
    case "flooring-calculator": {
      setDims("length1", "width1");
      break;
    }
    case "mulch-calculator":
    case "gravel-calculator": {
      if (area !== undefined && slug === "mulch-calculator") {
        fields.shape = "custom";
        fields.area = String(area);
        notes.push(`${area} sq ft`);
      } else if (dims) {
        if (slug === "mulch-calculator") fields.shape = "rectangle";
        setDims("length", "width");
      }
      const depth = extractInches(text, ["deep", "depth"]);
      if (depth !== undefined) {
        fields.depth = String(depth);
        notes.push(`${depth} in deep`);
      }
      break;
    }
    case "drywall-calculator": {
      setDims("length", "width");
      break;
    }
    case "tile-calculator": {
      setDims("length", "width");
      const tile = extractTileSize(text);
      if (tile) {
        fields.tileLength = String(tile.length);
        fields.tileWidth = String(tile.width);
        notes.push(`${tile.length} × ${tile.width} in tiles`);
      }
      break;
    }
    case "deck-calculator": {
      setDims("length", "width");
      break;
    }
    case "sod-calculator": {
      if (dims) {
        setDims("length", "width");
      } else if (area !== undefined) {
        fields.extraArea = String(area);
        notes.push(`${area} sq ft`);
      }
      break;
    }
    default:
      break;
  }

  // Area given without dimensions: most planners can use it via a shape option.
  if (Object.keys(fields).length === 0 && area !== undefined && slug === "gravel-calculator") {
    notes.push(`${area} sq ft`);
  }

  return { fields, notes };
}

/* ------------------------------------------------------------------ main -- */

export function parseWithRules(input: string): ParseResult {
  const text = input.trim();
  if (!text) return { ok: false, candidates: [] };

  const { slug, candidates } = detectProject(text);
  if (!slug) return { ok: false, candidates: [] };

  const { fields, notes } = buildFields(slug, text);
  const numericFields = Object.keys(fields).filter((key) => !Number.isNaN(Number(fields[key])));

  const confidence: ParsedProject["confidence"] =
    numericFields.length >= 2 ? "high" : numericFields.length === 1 ? "medium" : "low";

  return {
    ok: true,
    parsed: { slug, fields, confidence, interpretation: notes, source: "rules" },
    candidates: candidates.filter((candidate) => candidate !== slug),
  };
}
