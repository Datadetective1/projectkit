/**
 * One-time localStorage key migration, for the ProjectKit → Cubitora rename.
 *
 * The brand changed; people's saved projects must not. Beta testers have real
 * work in `projectkit.projects.v1` — measurements they typed, notes about their
 * supplier, shopping lists they have half ticked off. Renaming the key without
 * moving the data would silently empty their drawer, and because there is no
 * account and no server copy, it would be gone for good.
 *
 * The rules this follows:
 *
 *  - **Copy, never move.** The old key is left in place. If this migration has
 *    a bug, the data is still there to recover; deleting it is a one-way door
 *    taken for the sake of a few kilobytes.
 *  - **Never overwrite.** If the new key already holds something, the user has
 *    used the renamed build and that data is newer. Leave it alone.
 *  - **Fail silently.** Storage can be unavailable or full. A failed migration
 *    must not stop the page rendering — the worst case is that someone sees an
 *    empty list and their old data is still on disk.
 */

/** Keys already migrated this session, so repeated reads do not re-run the copy. */
const migrated = new Set<string>();

export function migrateStorageKey(fromKey: string, toKey: string): void {
  if (typeof window === "undefined") return;
  if (migrated.has(toKey)) return;
  migrated.add(toKey);

  try {
    const existing = window.localStorage.getItem(toKey);
    // Already on the new key — the renamed build has been used. Nothing to do.
    if (existing !== null) return;

    const legacy = window.localStorage.getItem(fromKey);
    if (legacy === null) return;

    window.localStorage.setItem(toKey, legacy);
  } catch {
    // Storage blocked, full, or otherwise unavailable. The old key is intact.
  }
}

/** Test seam: forget what has been migrated so a fresh case can be set up. */
export function resetMigrationMemoForTests(): void {
  migrated.clear();
}
