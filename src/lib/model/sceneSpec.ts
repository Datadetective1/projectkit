import type { InputValues } from "@/types/project";

/**
 * What the 3D model draws, worked out from a planner's canonical inputs.
 *
 * Kept apart from the renderer so it can be tested without WebGL, and so the
 * model never invents a dimension: every size it draws is one the person typed
 * (or the planner's default), in US units. Lengths are feet, depths and
 * thicknesses are inches, exactly as the planners store them.
 */

export type SceneKind = "slab" | "bed" | "gravel" | "lawn" | "deck" | "fence" | "room";

export interface SceneSpec {
  kind: SceneKind;
  /** Footprint along x, in feet. */
  length: number;
  /** Footprint along z, in feet. */
  width: number;
  /** Layer thickness in inches (slab, bed, gravel), or height in feet (deck, fence, room). */
  height: number;
  /** A round bed rather than a rectangle. */
  round?: boolean;
  /** A fence run that encloses the area rather than one straight line. */
  enclosed?: boolean;
  /** Which surface of a room the project covers. */
  surface?: "walls" | "floor";
  /** Material colour, from the site's material swatches. */
  color: string;
  /** The two or three measurements printed beside the model. */
  labels: string[];
}

const SWATCH: Record<string, string> = {
  "concrete-calculator": "#a9aba3",
  "gravel-calculator": "#8a929b",
  "mulch-calculator": "#6a4829",
  "sod-calculator": "#5f9a3c",
  "deck-calculator": "#a86d3f",
  "fence-calculator": "#9c6a41",
  "paint-calculator": "#7fb5a8",
  "drywall-calculator": "#d9d5c9",
  "flooring-calculator": "#b0834a",
  "tile-calculator": "#5f9e98",
};

function num(values: InputValues, id: string, fallback: number): number {
  const value = Number(values[id]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** "20 ft", "4.5 ft", "1,200 sq ft". */
function feet(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("en-US")} ft`;
}

function inches(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} in`;
}

/** A square footprint with the given area, for planners that take an area. */
function squareOf(area: number) {
  const side = Math.sqrt(Math.max(area, 1));
  return { length: side, width: side };
}

/**
 * The scene for a planner, or null when there is nothing honest to draw (an
 * unknown planner). Values must be canonical (see `toCanonicalValues`).
 */
export function sceneFor(slug: string, values: InputValues): SceneSpec | null {
  const color = SWATCH[slug] ?? "#9aa39f";

  switch (slug) {
    case "concrete-calculator": {
      const length = num(values, "length", 20);
      const width = num(values, "width", 16);
      const thickness = num(values, "thickness", 4);
      return {
        kind: "slab",
        length,
        width,
        height: thickness,
        color,
        labels: [feet(length), feet(width), `${inches(thickness)} thick`],
      };
    }

    case "gravel-calculator": {
      const length = num(values, "length", 20);
      const width = num(values, "width", 10);
      const depth = num(values, "depth", 4);
      return {
        kind: "gravel",
        length,
        width,
        height: depth,
        color,
        labels: [feet(length), feet(width), `${inches(depth)} deep`],
      };
    }

    case "mulch-calculator": {
      const depth = num(values, "depth", 3);
      const shape = String(values.shape ?? "rectangle");
      if (shape === "circle") {
        const diameter = num(values, "diameter", 10);
        return {
          kind: "bed",
          length: diameter,
          width: diameter,
          height: depth,
          round: true,
          color,
          labels: [`${feet(diameter)} across`, `${inches(depth)} deep`],
        };
      }
      if (shape === "custom") {
        const area = num(values, "area", 200);
        return {
          kind: "bed",
          ...squareOf(area),
          height: depth,
          color,
          labels: [`${Math.round(area).toLocaleString("en-US")} sq ft`, `${inches(depth)} deep`],
        };
      }
      const length = num(values, "length", 40);
      const width = num(values, "width", 30);
      return {
        kind: "bed",
        length,
        width,
        height: depth,
        color,
        labels: [feet(length), feet(width), `${inches(depth)} deep`],
      };
    }

    case "sod-calculator": {
      const length = num(values, "length", 40);
      const width = num(values, "width", 25);
      return {
        kind: "lawn",
        length,
        width,
        height: 1,
        color,
        labels: [feet(length), feet(width)],
      };
    }

    case "deck-calculator": {
      const length = num(values, "length", 16);
      const width = num(values, "width", 12);
      const height = num(values, "height", 3);
      return {
        kind: "deck",
        length,
        width,
        height,
        color,
        labels: [feet(length), feet(width), `${feet(height)} high`],
      };
    }

    case "fence-calculator": {
      const height = num(values, "height", 6);
      if (values.layout === "rectangle" || values.layout === undefined) {
        const length = num(values, "length", 75);
        const width = num(values, "width", 110);
        return {
          kind: "fence",
          length,
          width,
          height,
          enclosed: true,
          color,
          labels: [feet(length), feet(width), `${feet(height)} high`],
        };
      }
      const run = num(values, "runLength", 100);
      return {
        kind: "fence",
        length: run,
        width: Math.max(run * 0.12, 4),
        height,
        enclosed: false,
        color,
        labels: [`${feet(run)} run`, `${feet(height)} high`],
      };
    }

    case "paint-calculator":
    case "drywall-calculator": {
      const length = num(values, "length", 12);
      const width = num(values, "width", 12);
      const height = num(values, "height", 8);
      return {
        kind: "room",
        length,
        width,
        height,
        surface: "walls",
        color,
        labels: [feet(length), feet(width), `${feet(height)} walls`],
      };
    }

    case "flooring-calculator": {
      const length = num(values, "length1", 15);
      const width = num(values, "width1", 12);
      return {
        kind: "room",
        length,
        width,
        height: 8,
        surface: "floor",
        color,
        labels: [feet(length), feet(width)],
      };
    }

    case "tile-calculator": {
      const length = num(values, "length", 10);
      const width = num(values, "width", 8);
      return {
        kind: "room",
        length,
        width,
        height: 8,
        surface: "floor",
        color,
        labels: [feet(length), feet(width)],
      };
    }

    default:
      return null;
  }
}
