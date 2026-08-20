import { features } from "@/config/site";
import { migrateStorageKey } from "@/lib/storage/migrateKey";

/**
 * Project Pack entitlements.
 *
 * MVP has no accounts, so an unlock is recorded locally against the saved
 * project id after Stripe confirms the session (or immediately when the dev
 * unlock flag is on). Server-side verification happens in /api/checkout/verify;
 * this module only remembers the answer.
 */

const STORAGE_KEY = "cubitora.unlocks.v1";
/** Carried forward so a beta purchase is not lost to the rename. */
const LEGACY_STORAGE_KEY = "projectkit.unlocks.v1";

interface UnlockRecord {
  projectId: string;
  sessionId?: string;
  unlockedAt: string;
}

function readAll(): UnlockRecord[] {
  try {
    if (typeof window === "undefined") return [];
    migrateStorageKey(LEGACY_STORAGE_KEY, STORAGE_KEY);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is UnlockRecord =>
        Boolean(item) && typeof (item as UnlockRecord).projectId === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(records: UnlockRecord[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Unlock state is a convenience; losing it is not fatal.
  }
}

export function isPackUnlocked(projectId: string): boolean {
  // Free-during-beta is a product state and applies everywhere; the dev unlock
  // is a local convenience the server refuses in production.
  if (features.projectPackFree || features.projectPackDevUnlock) return true;
  return readAll().some((record) => record.projectId === projectId);
}

export function recordUnlock(projectId: string, sessionId?: string): void {
  const records = readAll().filter((record) => record.projectId !== projectId);
  records.push({ projectId, sessionId, unlockedAt: new Date().toISOString() });
  writeAll(records);
}

/** True when access was granted by configuration rather than a purchase. */
export function isDevUnlock(): boolean {
  return features.projectPackFree || features.projectPackDevUnlock;
}
