import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateStorageKey, resetMigrationMemoForTests } from "@/lib/storage/migrateKey";

/**
 * The ProjectKit → Cubitora key migration.
 *
 * There is no account and no server copy, so a beta tester's saved projects
 * exist in exactly one place. Getting this wrong does not degrade the product,
 * it deletes someone's work — which is why the copy is non-destructive and why
 * these tests check the failure directions rather than just the happy path.
 */

function fakeStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    store: data,
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const globalWithWindow = globalThis as unknown as { window?: unknown };
let previousWindow: unknown;

beforeEach(() => {
  previousWindow = globalWithWindow.window;
  resetMigrationMemoForTests();
});

afterEach(() => {
  globalWithWindow.window = previousWindow;
  resetMigrationMemoForTests();
});

describe("legacy key migration", () => {
  it("copies a beta tester's saved projects to the new key", () => {
    const saved = JSON.stringify([{ id: "a1", slug: "concrete-calculator", title: "Patio" }]);
    const localStorage = fakeStorage({ "projectkit.projects.v1": saved });
    globalWithWindow.window = { localStorage };

    migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1");

    expect(localStorage.getItem("cubitora.projects.v1")).toBe(saved);
  });

  it("leaves the old key in place rather than moving the data", () => {
    // Non-destructive on purpose: if this migration has a bug, the original is
    // still on disk to recover from. Deleting it is a one-way door.
    const saved = JSON.stringify([{ id: "a1" }]);
    const localStorage = fakeStorage({ "projectkit.projects.v1": saved });
    globalWithWindow.window = { localStorage };

    migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1");

    expect(localStorage.getItem("projectkit.projects.v1")).toBe(saved);
  });

  it("never overwrites newer data on the new key", () => {
    // The user has already used the renamed build. Their newer work wins.
    const localStorage = fakeStorage({
      "projectkit.projects.v1": JSON.stringify([{ id: "old" }]),
      "cubitora.projects.v1": JSON.stringify([{ id: "new" }]),
    });
    globalWithWindow.window = { localStorage };

    migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1");

    expect(localStorage.getItem("cubitora.projects.v1")).toContain("new");
    expect(localStorage.getItem("cubitora.projects.v1")).not.toContain("old");
  });

  it("treats an empty array on the new key as real data, not as absence", () => {
    /*
     * The subtle one. A user who deleted all their projects on the new build
     * has "[]" stored, which is falsy-looking but is a deliberate state. Copying
     * the old list back would resurrect projects they intentionally removed.
     */
    const localStorage = fakeStorage({
      "projectkit.projects.v1": JSON.stringify([{ id: "deleted-on-purpose" }]),
      "cubitora.projects.v1": "[]",
    });
    globalWithWindow.window = { localStorage };

    migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1");

    expect(localStorage.getItem("cubitora.projects.v1")).toBe("[]");
  });

  it("does nothing when there is no legacy data", () => {
    const localStorage = fakeStorage();
    globalWithWindow.window = { localStorage };

    migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1");

    expect(localStorage.getItem("cubitora.projects.v1")).toBeNull();
    expect(localStorage.store.size).toBe(0);
  });

  it("survives storage being blocked", () => {
    // Private browsing and quota exhaustion both throw here. A failed migration
    // must not stop the page rendering; the old key is untouched either way.
    globalWithWindow.window = {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    };

    expect(() => migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1")).not.toThrow();
  });

  it("does nothing on the server, where there is no storage", () => {
    globalWithWindow.window = undefined;
    expect(() => migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1")).not.toThrow();
  });

  it("only copies once, even across repeated reads", () => {
    const localStorage = fakeStorage({ "projectkit.projects.v1": JSON.stringify([{ id: "a" }]) });
    const setItem = vi.fn(localStorage.setItem);
    globalWithWindow.window = { localStorage: { ...localStorage, setItem } };

    migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1");
    migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1");
    migrateStorageKey("projectkit.projects.v1", "cubitora.projects.v1");

    expect(setItem).toHaveBeenCalledTimes(1);
  });
});
