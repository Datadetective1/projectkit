"use client";

import { useSyncExternalStore } from "react";
import { listProjects, type SavedProject } from "./savedProjects";

/**
 * localStorage as a React external store.
 *
 * Reading storage inside an effect works but cascades an extra render on every
 * mount; `useSyncExternalStore` is the shape React actually wants for this, and
 * it keeps every list in the app in sync when a project is saved or deleted.
 *
 * The snapshot is cached because `useSyncExternalStore` compares by reference —
 * re-parsing JSON on every render would loop forever.
 */

const EMPTY: SavedProject[] = [];
let snapshot: SavedProject[] | undefined;

function invalidate() {
  snapshot = undefined;
}

function subscribe(onChange: () => void): () => void {
  const handler = () => {
    invalidate();
    onChange();
  };
  window.addEventListener("projectkit:projects-changed", handler);
  // Keeps other tabs in step.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("projectkit:projects-changed", handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot(): SavedProject[] {
  if (!snapshot) snapshot = listProjects();
  return snapshot;
}

function getServerSnapshot(): SavedProject[] {
  return EMPTY;
}

export function useSavedProjects(): SavedProject[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useSavedProject(id: string | undefined): SavedProject | undefined {
  const projects = useSavedProjects();
  if (!id) return undefined;
  return projects.find((project) => project.id === id);
}

/** True once the browser store has been read at least once. */
export function useStorageReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
