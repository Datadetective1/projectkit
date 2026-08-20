import { migrateStorageKey } from "@/lib/storage/migrateKey";
import type { UnitSystem } from "@/lib/units";
import type { InputValues } from "@/types/project";

/**
 * Saved projects live in localStorage — no account, no server, no friction.
 *
 * The shape is versioned and every read is defensive, because localStorage can
 * be disabled, full, or contain data written by an older build. Nothing here
 * throws; a storage failure degrades to "no saved projects".
 */

const STORAGE_KEY = "cubitora.projects.v1";
/**
 * The Cubitora-era key. Beta testers have real work under it, so it is copied
 * forward on first read rather than abandoned. See storage/migrateKey.ts.
 */
const LEGACY_STORAGE_KEY = "projectkit.projects.v1";

/** Fired after any write, so open tabs and the list component stay in sync. */
export const PROJECTS_CHANGED_EVENT = "cubitora:projects-changed";

export interface SavedProject {
  id: string;
  slug: string;
  title: string;
  unitSystem: UnitSystem;
  values: InputValues;
  notes: string;
  /** Shopping-list item ids that have been ticked off. */
  checked: string[];
  contractorQuote?: number;
  createdAt: string;
  updatedAt: string;
}

export type SavedProjectDraft = Omit<SavedProject, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export function isStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const probe = "__pk_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function isSavedProject(value: unknown): value is SavedProject {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.slug === "string" &&
    typeof record.title === "string" &&
    (record.unitSystem === "us" || record.unitSystem === "metric") &&
    typeof record.values === "object" &&
    record.values !== null
  );
}

function normalise(project: SavedProject): SavedProject {
  return {
    ...project,
    notes: typeof project.notes === "string" ? project.notes : "",
    checked: Array.isArray(project.checked)
      ? project.checked.filter((item): item is string => typeof item === "string")
      : [],
    createdAt: typeof project.createdAt === "string" ? project.createdAt : new Date().toISOString(),
    updatedAt: typeof project.updatedAt === "string" ? project.updatedAt : new Date().toISOString(),
  };
}

export function listProjects(): SavedProject[] {
  try {
    if (!isStorageAvailable()) return [];
    migrateStorageKey(LEGACY_STORAGE_KEY, STORAGE_KEY);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isSavedProject)
      .map(normalise)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeAll(projects: SavedProject[]): boolean {
  try {
    if (!isStorageAvailable()) return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function getSavedProject(id: string): SavedProject | undefined {
  return listProjects().find((project) => project.id === id);
}

function createId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the timestamp-based id.
  }
  return `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Insert or update. Returns the saved project, or undefined if storage failed. */
export function saveProject(draft: SavedProjectDraft): SavedProject | undefined {
  const now = new Date().toISOString();
  const projects = listProjects();
  const existingIndex = draft.id
    ? projects.findIndex((project) => project.id === draft.id)
    : -1;

  const project: SavedProject = normalise({
    ...draft,
    id: draft.id ?? createId(),
    createdAt: existingIndex >= 0 ? projects[existingIndex].createdAt : now,
    updatedAt: now,
  } as SavedProject);

  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.unshift(project);
  }

  return writeAll(projects) ? project : undefined;
}

export function deleteProject(id: string): boolean {
  const remaining = listProjects().filter((project) => project.id !== id);
  return writeAll(remaining);
}

export function clearProjects(): boolean {
  return writeAll([]);
}
