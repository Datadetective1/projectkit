import { describe, expect, it } from "vitest";
import { buildPack, packFileName } from "@/lib/pack/buildPack";
import { buildTextSummary } from "@/lib/summary";
import { getProjectOrThrow, projects } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import type { SavedProject } from "@/lib/storage/savedProjects";

function saved(overrides: Partial<SavedProject> = {}): SavedProject {
  const project = getProjectOrThrow(overrides.slug ?? "concrete-calculator");
  return {
    id: "test-id",
    slug: project.slug,
    title: "Concrete — 20 × 16 ft",
    unitSystem: "us",
    values: defaultValues(project, "us"),
    notes: "",
    checked: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("project pack", () => {
  it("builds every section from a saved project", () => {
    const pack = buildPack(saved());
    expect(pack).toBeDefined();
    if (!pack) return;

    expect(pack.title).toBe("Concrete — 20 × 16 ft");
    expect(pack.headline.value).toBe("4.35 yd³");
    expect(pack.summary.length).toBeGreaterThan(3);
    expect(pack.materials.length).toBeGreaterThan(2);
    expect(pack.checklist.length).toBeGreaterThan(5);
    expect(pack.steps.length).toBeGreaterThan(5);
    expect(pack.assumptions.length).toBeGreaterThan(2);
    expect(pack.formulas.length).toBeGreaterThan(2);
    expect(pack.scenarios.length).toBeGreaterThan(0);
    expect(pack.disclaimer).toMatch(/planning estimates only/i);
  });

  it("pre-formats every value, so the PDF and the preview cannot disagree", () => {
    const pack = buildPack(saved());
    if (!pack) throw new Error("no pack");

    for (const row of [...pack.summary, ...pack.assumptions, ...pack.formulas]) {
      expect(typeof row.value).toBe("string");
      expect(row.value).not.toMatch(/NaN|Infinity|undefined/);
    }
    for (const material of pack.materials) {
      expect(material.quantity).not.toMatch(/NaN|Infinity|undefined/);
      expect(material.cost).not.toMatch(/NaN|Infinity|undefined/);
    }
    expect(pack.costTotal).toMatch(/^\$[\d,]/);
  });

  it("carries the ticked shopping list items across", () => {
    const pack = buildPack(saved({ checked: ["material:ready-mix", "extra:screed"] }));
    if (!pack) throw new Error("no pack");

    const ticked = pack.checklist.filter((item) => item.checked);
    expect(ticked).toHaveLength(2);
    expect(ticked.map((item) => item.label)).toContain(
      "Ready-mix concrete (delivered)",
    );
  });

  it("includes notes and a contractor quote when present", () => {
    const pack = buildPack(saved({ notes: "Delivery Tuesday", contractorQuote: 4200 }));
    expect(pack?.notes).toBe("Delivery Tuesday");
    expect(pack?.contractorQuote).toBe("$4,200");
  });

  it("omits a contractor quote of zero rather than printing $0", () => {
    expect(buildPack(saved({ contractorQuote: 0 }))?.contractorQuote).toBeUndefined();
  });

  it("renders metric packs in metric", () => {
    const project = getProjectOrThrow("concrete-calculator");
    const pack = buildPack(
      saved({ unitSystem: "metric", values: defaultValues(project, "metric") }),
    );
    expect(pack?.headline.value).toMatch(/m³$/);
    expect(pack?.summary.some((row) => row.value.includes("m²"))).toBe(true);
  });

  it("returns undefined for an unknown project rather than throwing", () => {
    // A project removed in a later release, still referenced by a saved entry.
    const orphan: SavedProject = { ...saved(), slug: "retired-calculator" };
    expect(buildPack(orphan)).toBeUndefined();
  });

  it("returns undefined when the stored values no longer validate", () => {
    expect(buildPack(saved({ values: { length: -5, width: 0 } }))).toBeUndefined();
  });

  it("builds a pack for every project", () => {
    for (const project of projects) {
      const pack = buildPack(
        saved({ slug: project.slug, values: defaultValues(project, "us") }),
      );
      expect(pack, project.slug).toBeDefined();
      expect(pack?.materials.length, project.slug).toBeGreaterThan(0);
    }
  });
});

describe("pack filenames", () => {
  it("is safe for a filesystem", () => {
    const pack = buildPack(saved({ title: "Concrete — 20 × 16 ft / patio?" }));
    if (!pack) throw new Error("no pack");
    const name = packFileName(pack);
    expect(name).toMatch(/^cubitora-[a-z0-9-]+\.pdf$/);
    expect(name).not.toMatch(/[/\\?%*:|"<>]/);
  });

  it("falls back rather than producing a bare extension", () => {
    const pack = buildPack(saved({ title: "×××" }));
    if (!pack) throw new Error("no pack");
    expect(packFileName(pack)).toBe("cubitora-project.pdf");
  });
});

describe("text summary", () => {
  function summaryFor(slug: string) {
    const project = getProjectOrThrow(slug);
    const values = defaultValues(project, "us");
    const result = evaluate(project, values, "us");
    if (!result.ok) throw new Error("evaluation failed");
    return buildTextSummary({
      projectName: project.name,
      result: result.result,
      system: "us",
      url: "https://example.test/concrete-calculator",
    });
  }

  it("reads as something you could paste into a message", () => {
    const text = summaryFor("concrete-calculator");
    expect(text).toContain("Concrete — Cubitora estimate");
    expect(text).toContain("4.35 yd³");
    expect(text).toContain("Ready-mix concrete (delivered)");
    expect(text).toContain("Estimated material total");
    expect(text).toContain("Planning estimate only");
    expect(text).toContain("https://example.test/concrete-calculator");
  });

  it("never leaks a broken number for any project", () => {
    for (const project of projects) {
      const text = summaryFor(project.slug);
      expect(text, project.slug).not.toMatch(/NaN|Infinity|undefined/);
      expect(text.length, project.slug).toBeGreaterThan(120);
    }
  });

  it("omits the link when there is not one", () => {
    const project = getProjectOrThrow("mulch-calculator");
    const result = evaluate(project, defaultValues(project, "us"), "us");
    if (!result.ok) throw new Error("evaluation failed");
    const text = buildTextSummary({
      projectName: project.name,
      result: result.result,
      system: "us",
    });
    expect(text).not.toContain("http");
  });
});
