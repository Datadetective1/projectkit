import { concreteProject } from "./concrete";
import { deckProject } from "./deck";
import { drywallProject } from "./drywall";
import { fenceProject } from "./fence";
import { flooringProject } from "./flooring";
import { gravelProject } from "./gravel";
import { mulchProject } from "./mulch";
import { paintProject } from "./paint";
import { sodProject } from "./sod";
import { tileProject } from "./tile";
import type { ProjectDefinition } from "@/types/project";

/**
 * The project registry.
 *
 * Adding project #11 means: write a calculation in lib/calculations, write a
 * definition in data/projects, and add it to this array. Nothing else in the
 * application needs to change — routing, SEO, the planner UI, the shopping
 * list, saving, and the Project Pack are all driven off these definitions.
 */
export const projects: ProjectDefinition[] = [
  concreteProject,
  fenceProject,
  paintProject,
  flooringProject,
  mulchProject,
  gravelProject,
  drywallProject,
  tileProject,
  deckProject,
  sodProject,
];

const bySlug = new Map(projects.map((project) => [project.slug, project]));

export function getProject(slug: string): ProjectDefinition | undefined {
  return bySlug.get(slug);
}

export function getProjectOrThrow(slug: string): ProjectDefinition {
  const project = bySlug.get(slug);
  if (!project) throw new Error(`Unknown project: ${slug}`);
  return project;
}

export function projectSlugs(): string[] {
  return projects.map((project) => project.slug);
}

export function relatedProjects(slug: string): ProjectDefinition[] {
  const project = getProject(slug);
  if (!project) return [];
  return project.related
    .map((related) => bySlug.get(related))
    .filter((related): related is ProjectDefinition => Boolean(related));
}
