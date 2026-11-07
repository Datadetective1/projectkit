import { describe, expect, it } from "vitest";
import { sceneFor } from "@/lib/model/sceneSpec";
import { defaultValues, toCanonicalValues } from "@/lib/calc/engine";
import { getProject } from "@/data/projects";

const SLUGS = [
  "concrete-calculator",
  "gravel-calculator",
  "mulch-calculator",
  "sod-calculator",
  "deck-calculator",
  "fence-calculator",
  "paint-calculator",
  "drywall-calculator",
  "flooring-calculator",
  "tile-calculator",
];

describe("sceneFor", () => {
  it("draws every planner at its defaults, with real dimensions", () => {
    for (const slug of SLUGS) {
      const project = getProject(slug);
      expect(project, slug).toBeDefined();
      const values = toCanonicalValues(project!, defaultValues(project!, "us"), "us");
      const scene = sceneFor(slug, values);
      expect(scene, slug).not.toBeNull();
      expect(scene!.length, slug).toBeGreaterThan(0);
      expect(scene!.width, slug).toBeGreaterThan(0);
      expect(scene!.height, slug).toBeGreaterThan(0);
      expect(scene!.labels.length, slug).toBeGreaterThan(0);
    }
  });

  it("uses the typed size, not an invented one", () => {
    const scene = sceneFor("concrete-calculator", { length: 24, width: 12, thickness: 6 });
    expect(scene).toMatchObject({ kind: "slab", length: 24, width: 12, height: 6 });
    expect(scene!.labels).toEqual(["24 ft", "12 ft", "6 in thick"]);
  });

  it("follows metric input once converted to canonical units", () => {
    const project = getProject("concrete-calculator")!;
    const values = toCanonicalValues(
      project,
      { ...defaultValues(project, "metric"), length: 6, width: 4 },
      "metric",
    );
    const scene = sceneFor("concrete-calculator", values)!;
    expect(scene.length).toBeCloseTo(19.685, 2);
    expect(scene.width).toBeCloseTo(13.123, 2);
  });

  it("draws a round bed and a straight fence run", () => {
    expect(sceneFor("mulch-calculator", { shape: "circle", diameter: 12, depth: 3 })).toMatchObject({
      round: true,
      length: 12,
      width: 12,
    });
    expect(
      sceneFor("fence-calculator", { layout: "straight", runLength: 80, height: 6 }),
    ).toMatchObject({ enclosed: false, length: 80 });
  });

  it("returns nothing for an unknown planner", () => {
    expect(sceneFor("nope", {})).toBeNull();
  });
});
