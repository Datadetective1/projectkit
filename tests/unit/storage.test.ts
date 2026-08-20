import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Saved projects are the only user data ProjectKit keeps, so the failure modes
 * that matter are the ugly ones: storage disabled, storage full, and data
 * written by an older version of the app.
 */

class MemoryStorage {
  private store = new Map<string, string>();
  throwOnWrite = false;

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.throwOnWrite) throw new DOMException("QuotaExceededError");
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  /** Bypasses the guard so tests can plant malformed data. */
  seed(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const storage = new MemoryStorage();
const events: string[] = [];

vi.stubGlobal("window", {
  localStorage: storage,
  dispatchEvent: (event: { type: string }) => {
    events.push(event.type);
    return true;
  },
});
vi.stubGlobal("CustomEvent", class {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
});

const {
  clearProjects,
  deleteProject,
  getSavedProject,
  isStorageAvailable,
  listProjects,
  saveProject,
} = await import("@/lib/storage/savedProjects");

const KEY = "cubitora.projects.v1";

function draft(overrides: Record<string, unknown> = {}) {
  return {
    slug: "concrete-calculator",
    title: "Concrete — 20 × 16 ft",
    unitSystem: "us" as const,
    values: { length: 20, width: 16 },
    notes: "",
    checked: [],
    ...overrides,
  };
}

beforeEach(() => {
  storage.clear();
  storage.throwOnWrite = false;
  events.length = 0;
});

describe("availability", () => {
  it("reports storage as usable when it is", () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it("reports storage as unusable when writes throw", () => {
    storage.throwOnWrite = true;
    expect(isStorageAvailable()).toBe(false);
  });
});

describe("saving", () => {
  it("creates a project with an id and timestamps", () => {
    const saved = saveProject(draft());
    expect(saved).toBeDefined();
    expect(saved?.id).toBeTruthy();
    expect(saved?.createdAt).toBeTruthy();
    expect(saved?.updatedAt).toBeTruthy();
    expect(listProjects()).toHaveLength(1);
  });

  it("updates in place rather than duplicating", () => {
    const first = saveProject(draft());
    const second = saveProject(draft({ id: first?.id, title: "Renamed" }));

    expect(second?.id).toBe(first?.id);
    expect(listProjects()).toHaveLength(1);
    expect(listProjects()[0].title).toBe("Renamed");
  });

  it("keeps the original creation time across updates", () => {
    const first = saveProject(draft());
    const second = saveProject(draft({ id: first?.id, notes: "later" }));
    expect(second?.createdAt).toBe(first?.createdAt);
  });

  it("notifies listeners so open lists refresh", () => {
    saveProject(draft());
    expect(events).toContain("cubitora:projects-changed");
  });

  it("returns undefined instead of throwing when storage is full", () => {
    storage.throwOnWrite = true;
    expect(saveProject(draft())).toBeUndefined();
  });
});

describe("reading", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(listProjects()).toEqual([]);
  });

  it("finds a project by id", () => {
    const saved = saveProject(draft());
    expect(getSavedProject(saved!.id)?.title).toBe("Concrete — 20 × 16 ft");
    expect(getSavedProject("nope")).toBeUndefined();
  });

  it("sorts most recently updated first", () => {
    const older = saveProject(draft({ title: "Older" }));
    // Force a distinct timestamp.
    const stored = JSON.parse(storage.getItem(KEY)!);
    stored[0].updatedAt = "2020-01-01T00:00:00.000Z";
    storage.seed(KEY, JSON.stringify(stored));

    saveProject(draft({ title: "Newer" }));
    const titles = listProjects().map((project) => project.title);
    expect(titles[0]).toBe("Newer");
    expect(titles[1]).toBe("Older");
    expect(older).toBeDefined();
  });
});

describe("corrupt or foreign data", () => {
  it("survives invalid JSON", () => {
    storage.seed(KEY, "{not json");
    expect(listProjects()).toEqual([]);
  });

  it("survives a non-array payload", () => {
    storage.seed(KEY, JSON.stringify({ nope: true }));
    expect(listProjects()).toEqual([]);
  });

  it("drops entries that do not look like projects", () => {
    storage.seed(
      KEY,
      JSON.stringify([
        { id: "a", slug: "concrete-calculator", title: "Good", unitSystem: "us", values: {} },
        { id: "b" },
        null,
        "string",
        { id: "c", slug: "x", title: "Bad units", unitSystem: "furlongs", values: {} },
      ]),
    );

    const projects = listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe("Good");
  });

  it("fills in fields an older version did not write", () => {
    storage.seed(
      KEY,
      JSON.stringify([
        { id: "a", slug: "concrete-calculator", title: "Old", unitSystem: "us", values: {} },
      ]),
    );

    const project = listProjects()[0];
    expect(project.notes).toBe("");
    expect(project.checked).toEqual([]);
    expect(project.createdAt).toBeTruthy();
  });

  it("discards non-string entries in the checked list", () => {
    storage.seed(
      KEY,
      JSON.stringify([
        {
          id: "a",
          slug: "concrete-calculator",
          title: "Old",
          unitSystem: "us",
          values: {},
          checked: ["good", 42, null, { nope: true }],
        },
      ]),
    );

    expect(listProjects()[0].checked).toEqual(["good"]);
  });
});

describe("deleting", () => {
  it("removes one project and leaves the rest", () => {
    const first = saveProject(draft({ title: "First" }));
    saveProject(draft({ title: "Second" }));

    deleteProject(first!.id);
    const remaining = listProjects();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe("Second");
  });

  it("clears everything", () => {
    saveProject(draft());
    saveProject(draft({ title: "Another" }));
    clearProjects();
    expect(listProjects()).toEqual([]);
  });
});
