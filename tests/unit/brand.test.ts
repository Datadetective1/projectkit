import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { projects } from "@/data/projects";
import { site } from "@/config/site";

/**
 * The old public brand must not come back.
 *
 * A rename is easy to do and easy to half-undo — one copied component, one
 * merged branch, one AI-assisted edit that reaches for the name it saw most in
 * the history. This walks the actual source rather than trusting that the sweep
 * caught everything.
 *
 * Scope is deliberately `src/` only. `docs/` holds the pre-launch audit and its
 * findings, where "ProjectKit" is the historical record of what was true at the
 * time; rewriting it there would destroy the thing that makes it useful.
 */

const LEGACY_BRAND = /ProjectKit|Project Kit/;

/**
 * Places the old lowercase identifier is still correct, because it names
 * something that genuinely was called that and still is.
 */
const ALLOWED_LEGACY_IDENTIFIERS = [
  // The migration has to know the key it is reading *from*.
  "projectkit.projects.v1",
  "projectkit.unlocks.v1",
  // Comments explaining the above.
  "ProjectKit → Cubitora rename",
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|css)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("brand identity", () => {
  it("is Cubitora everywhere the configuration is read", () => {
    expect(site.name).toBe("Cubitora");
    expect(site.domain).toBe("cubitora.com");
    expect(site.tagline).toBe("Plan the project. Know what you need.");
  });

  it("never ships the old brand name in source", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles("src")) {
      const contents = readFileSync(file, "utf8");
      let scrubbed = contents;
      for (const allowed of ALLOWED_LEGACY_IDENTIFIERS) {
        scrubbed = scrubbed.split(allowed).join("");
      }
      if (LEGACY_BRAND.test(scrubbed)) {
        const line = scrubbed.split("\n").find((text) => LEGACY_BRAND.test(text));
        offenders.push(`${file}: ${line?.trim().slice(0, 90)}`);
      }
    }

    expect(offenders.join("\n")).toBe("");
  });

  it("keeps the legacy storage keys, which must stay spelled the old way", () => {
    // The counterpart to the test above: these two strings are load-bearing.
    // A brand sweep that "fixed" them would silently orphan every beta tester's
    // saved projects, which is exactly what happened once during this rename.
    const saved = readFileSync("src/lib/storage/savedProjects.ts", "utf8");
    const unlocks = readFileSync("src/lib/storage/entitlements.ts", "utf8");

    expect(saved).toContain('"projectkit.projects.v1"');
    expect(saved).toContain('"cubitora.projects.v1"');
    expect(unlocks).toContain('"projectkit.unlocks.v1"');
    expect(unlocks).toContain('"cubitora.unlocks.v1"');
  });

  it("describes every planner without naming the old brand", () => {
    for (const project of projects) {
      const prose = [
        project.intro,
        project.tagline,
        project.h1,
        project.seo.title,
        project.seo.description,
        ...project.steps,
        ...project.faq.flatMap((entry) => [entry.question, entry.answer]),
        ...(project.disclaimers ?? []),
      ].join(" ");

      expect(LEGACY_BRAND.test(prose), `${project.slug}`).toBe(false);
    }
  });
});
