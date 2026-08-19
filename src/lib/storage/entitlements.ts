import { features } from "@/config/site";

/**
 * Project Pack entitlements.
 *
 * MVP has no accounts, so an unlock is recorded locally against the saved
 * project id after Stripe confirms the session (or immediately when the dev
 * unlock flag is on). Server-side verification happens in /api/checkout/verify;
 * this module only remembers the answer.
 */

const STORAGE_KEY = "projectkit.unlocks.v1";

interface UnlockRecord {
  projectId: string;
  sessionId?: string;
  unlockedAt: string;
}

function readAll(): UnlockRecord[] {
  try {
    if (typeof window === "undefined") return [];
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
  if (features.projectPackDevUnlock) return true;
  return readAll().some((record) => record.projectId === projectId);
}

export function recordUnlock(projectId: string, sessionId?: string): void {
  const records = readAll().filter((record) => record.projectId !== projectId);
  records.push({ projectId, sessionId, unlockedAt: new Date().toISOString() });
  writeAll(records);
}

/** True when unlock is granted by the dev flag rather than a real purchase. */
export function isDevUnlock(): boolean {
  return features.projectPackDevUnlock;
}
