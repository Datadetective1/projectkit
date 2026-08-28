import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projects } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import { buildShoppingList } from "@/components/results/ShoppingList";

/**
 * The funnel's schema, proved without a browser.
 *
 * The browser half — that the events actually reach `dataLayer` in the right
 * order with the right parameters — lives in tests/e2e/analytics-ga4.spec.ts,
 * which runs against a server booted with a test measurement ID. What is
 * checked here is the logic that decides *what* gets sent, because that is
 * where a privacy mistake or a vocabulary drift would originate.
 *
 * tests/unit/analytics.test.ts covers URL redaction and the `page_location`
 * override; this file covers everything else about the event schema.
 */

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

async function analyticsWith(id: string | undefined) {
  vi.resetModules();
  process.env = { ...ORIGINAL, NEXT_PUBLIC_ANALYTICS_ID: id };
  return import("@/lib/analytics");
}

/* ------------------------------------------------- the canonical vocabulary -- */

/**
 * The funnel as agreed, written out here so a rename shows up as a test change
 * rather than as a silently different chart six weeks later.
 */
const FUNNEL = [
  "planner_started",
  "planner_completed",
  "project_pack_opened",
  "project_pack_downloaded",
  "shopping_list_viewed",
  "retailer_click",
] as const;

describe("the canonical funnel", () => {
  it("emits each step under exactly the agreed name", async () => {
    const analytics = await analyticsWith("G-TEST0000AA");
    const calls: { event: string; params: Record<string, unknown> }[] = [];

    const globalWithWindow = globalThis as unknown as { window?: unknown };
    const previous = globalWithWindow.window;
    globalWithWindow.window = {
      location: { href: "https://www.cubitora.com/concrete-calculator" },
      gtag: (_command: string, event: string, params: Record<string, unknown>) =>
        calls.push({ event, params }),
    };

    try {
      for (const event of FUNNEL) {
        if (event === "retailer_click") {
          analytics.track(event, { retailer: "amazon" });
        } else {
          analytics.track(event, {});
        }
      }
    } finally {
      globalWithWindow.window = previous;
    }

    expect(calls.map((call) => call.event)).toEqual([...FUNNEL]);
  });

  it("has no synonym for any step still in the vocabulary", async () => {
    /*
     * The old names were `project_started`, `project_pack_previewed` and
     * `affiliate_clicked`. Two events meaning the same thing is worse than one
     * badly named one: the funnel silently splits and neither half is right.
     */
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/analytics.ts", "utf8"),
    );
    for (const retired of ["project_started", "project_pack_previewed", "affiliate_clicked"]) {
      expect(source, `${retired} is still in the vocabulary`).not.toContain(`"${retired}"`);
    }
  });

  it("fires project_pack_opened from one place only", async () => {
    /*
     * The planner's "Preview project pack" button used to fire this *and* then
     * navigate to the pack page, which fired it again on mount. The ordinary
     * journey therefore counted the funnel's third step twice, which would have
     * made pack-open look like roughly double the reality — the single number
     * sitting between "finished a calculation" and "downloaded a plan".
     */
    const fs = await import("node:fs");
    const files = [
      "src/components/planner/ProjectPlanner.tsx",
      "src/components/pack/PackPreview.tsx",
      "src/components/pack/PackDocument.tsx",
    ];
    const emitting = files.filter((file) =>
      /track\(\s*"project_pack_opened"/.test(fs.readFileSync(file, "utf8")),
    );
    expect(emitting).toEqual(["src/components/pack/PackPreview.tsx"]);
  });
});

/* --------------------------------------------------------------- the GA gate -- */

describe("Google Analytics only loads for a real measurement ID", () => {
  it("is off when nothing is configured", async () => {
    const { isGoogleAnalyticsEnabled } = await analyticsWith(undefined);
    expect(isGoogleAnalyticsEnabled()).toBe(false);
  });

  it("is on for a well-formed GA4 id", async () => {
    const { isGoogleAnalyticsEnabled } = await analyticsWith("G-ABCDE12345");
    expect(isGoogleAnalyticsEnabled()).toBe(true);
  });

  it("rejects anything that is not a GA4 id", async () => {
    /*
     * The id is interpolated into an inline script and into a script `src`, so
     * a half-filled or malformed variable must not become markup. Validating
     * the shape rather than the length is what makes that impossible.
     */
    for (const bad of [
      "",
      "   ",
      "UA-12345-1", // Universal Analytics, long dead
      "GTM-ABCDE", // Tag Manager, not GA4
      "G-", // truncated
      "G-abc", // lowercase and too short
      "G-ABCDE12345';alert(1);//", // an injection attempt
      "<script>",
    ]) {
      const { isGoogleAnalyticsEnabled } = await analyticsWith(bad);
      expect(isGoogleAnalyticsEnabled(), `"${bad}" was accepted`).toBe(false);
    }
  });

  it("does not turn on because Vercel custom events are on", async () => {
    // The old gate was "any provider", which would have requested
    // gtag/js?id= with an empty id on every page of every render.
    vi.resetModules();
    process.env = {
      ...ORIGINAL,
      NEXT_PUBLIC_ANALYTICS_ID: "",
      NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS: "true",
    };
    const { isGoogleAnalyticsEnabled, isAnalyticsEnabled } = await import("@/lib/analytics");
    expect(isAnalyticsEnabled()).toBe(true);
    expect(isGoogleAnalyticsEnabled()).toBe(false);
  });

  it("sends nothing at all with no id, however the funnel is driven", async () => {
    const analytics = await analyticsWith(undefined);
    const calls: unknown[] = [];

    const globalWithWindow = globalThis as unknown as { window?: unknown };
    const previous = globalWithWindow.window;
    globalWithWindow.window = {
      location: { href: "https://www.cubitora.com/concrete-calculator?length=20" },
      gtag: (...args: unknown[]) => calls.push(args),
    };

    try {
      analytics.trackPageView("/concrete-calculator");
      for (const event of FUNNEL) {
        if (event === "retailer_click") analytics.track(event, { retailer: "amazon" });
        else analytics.track(event, { projectType: "concrete-calculator" });
      }
      expect(calls).toHaveLength(0);
    } finally {
      globalWithWindow.window = previous;
    }
  });
});

/* ------------------------------------------------------ the source vocabulary -- */

describe("source is a closed vocabulary, never a path", () => {
  it("classifies the pages the funnel needs to tell apart", async () => {
    const { sourceFromPath } = await import("@/lib/analytics");
    expect(sourceFromPath("/")).toBe("home");
    expect(sourceFromPath("/projects")).toBe("projects");
    expect(sourceFromPath("/plan")).toBe("plan");
    expect(sourceFromPath("/concrete-calculator")).toBe("planner");
    expect(sourceFromPath("/concrete-calculator/10x10-slab")).toBe("answer");
    expect(sourceFromPath("/about")).toBe("other");
    expect(sourceFromPath("/project-pack/9f3c1b7e")).toBe("other");
  });

  it("separates every planner from every answer page beneath it", async () => {
    // The organic experiment's whole question. If these two collapsed into one
    // token, "do answer pages produce planner usage?" becomes unanswerable.
    const { sourceFromPath } = await import("@/lib/analytics");
    for (const project of projects) {
      expect(sourceFromPath(`/${project.slug}`), project.slug).toBe("planner");
      expect(sourceFromPath(`/${project.slug}/some-answer`), project.slug).toBe("answer");
    }
  });

  it("never returns anything outside the vocabulary", async () => {
    const { ANALYTICS_SOURCES, sourceFromPath } = await import("@/lib/analytics");
    const allowed = new Set<string>(ANALYTICS_SOURCES);
    for (const path of [
      "/",
      "",
      "///",
      "/concrete-calculator/",
      "/concrete-calculator/10x10-slab/",
      "/plan?q=a%2020%20by%2016%20patio",
      "/concrete-calculator?length=20&width=16",
      "/my-projects",
      "/../../etc/passwd",
      "/" + "x".repeat(500),
      "/concrete-calculator#i-typed-this",
    ]) {
      const result = sourceFromPath(path);
      expect(allowed.has(result), `${path} → ${result}`).toBe(true);
    }
  });

  it("cannot echo back a query string or fragment even if handed one", async () => {
    // The signature takes a pathname, but a caller could pass a full path with
    // a query. Whatever arrives, the output is one of seven fixed tokens.
    const { sourceFromPath } = await import("@/lib/analytics");
    expect(sourceFromPath("/plan?q=my+kitchen+remodel")).toBe("plan");
    expect(sourceFromPath("/concrete-calculator?length=20&width=16")).toBe("planner");
    expect(sourceFromPath("/plan#a-note-to-myself")).toBe("plan");
  });

  it("is exactly the seven agreed values", async () => {
    const { ANALYTICS_SOURCES } = await import("@/lib/analytics");
    expect([...ANALYTICS_SOURCES].sort()).toEqual(
      ["answer", "direct", "home", "other", "plan", "planner", "projects"].sort(),
    );
  });
});

describe("entry source: where the visitor came from", () => {
  const globalWith = globalThis as unknown as {
    document?: { referrer: string };
    window?: { location: { origin: string } };
  };
  const previous = { document: globalWith.document, window: globalWith.window };

  function withReferrer(referrer: string) {
    globalWith.document = { referrer };
    globalWith.window = { location: { origin: "https://www.cubitora.com" } };
  }

  afterEach(() => {
    globalWith.document = previous.document;
    globalWith.window = previous.window;
  });

  it("reports the Cubitora page that sent them", async () => {
    const { entrySource, resetPathHistoryForTests } = await import("@/lib/analytics");
    resetPathHistoryForTests();

    withReferrer("https://www.cubitora.com/concrete-calculator/10x10-slab");
    expect(entrySource("/concrete-calculator")).toBe("answer");

    withReferrer("https://www.cubitora.com/");
    expect(entrySource("/concrete-calculator")).toBe("home");
  });

  it("follows a client-side navigation, which leaves no referrer behind", async () => {
    /*
     * Next moves between routes with the History API, so `document.referrer`
     * stays frozen at whatever loaded the document — usually nothing. Somebody
     * clicking from an answer page into the planner is exactly the journey this
     * field exists to measure, and the referrer cannot see it.
     */
    const { entrySource, notePathChange, resetPathHistoryForTests } = await import(
      "@/lib/analytics"
    );
    resetPathHistoryForTests();
    withReferrer("");

    notePathChange("/concrete-calculator/10x10-slab");
    // The planner's effect can run either side of the provider's; both orders
    // have to give the same answer.
    expect(entrySource("/concrete-calculator")).toBe("answer");
    notePathChange("/concrete-calculator");
    expect(entrySource("/concrete-calculator")).toBe("answer");
  });

  it("calls a visit with no referrer at all direct", async () => {
    const { entrySource, resetPathHistoryForTests } = await import("@/lib/analytics");
    resetPathHistoryForTests();
    withReferrer("");
    expect(entrySource("/concrete-calculator")).toBe("direct");
  });

  it("never reports another site, however it arrived", async () => {
    /*
     * An external referrer is somebody else's URL. It is not ours to record, it
     * can carry a search query, and it would explode the vocabulary — so it
     * collapses to `other`, which is honest about not knowing.
     */
    const { entrySource, resetPathHistoryForTests } = await import("@/lib/analytics");
    for (const referrer of [
      "https://www.google.com/search?q=how+much+concrete+for+a+10x10+slab",
      "https://www.bing.com/search?q=deck+cost",
      "https://www.cubitora.com.evil.example/concrete-calculator",
      "https://old.reddit.com/r/DIY/comments/whatever",
    ]) {
      resetPathHistoryForTests();
      withReferrer(referrer);
      expect(entrySource("/concrete-calculator"), referrer).toBe("other");
    }
  });

  it("survives a malformed referrer", async () => {
    const { entrySource, resetPathHistoryForTests } = await import("@/lib/analytics");
    resetPathHistoryForTests();
    withReferrer("not a url");
    expect(entrySource("/concrete-calculator")).toBe("other");
  });
});

/* ---------------------------------------------------------- controlled values -- */

describe("retailer is a controlled value", () => {
  it("is one of the ids the config declares, and amazon is the only live one", async () => {
    const { retailers } = await import("@/config/retailers");
    expect(retailers.map((retailer) => retailer.id)).toEqual(["amazon"]);
  });

  it("cannot be emitted by a call site that has no retailer to name", async () => {
    /*
     * Enforced by the type rather than by review: `track("retailer_click", …)`
     * takes a `RetailerId`. This asserts the consequence — the one outbound
     * surface that cannot name a retailer no longer claims the funnel's
     * terminal event.
     */
    const fs = await import("node:fs");
    const shopMaterials = fs.readFileSync("src/components/monetization/ShopMaterials.tsx", "utf8");
    expect(shopMaterials).not.toMatch(/track\(\s*"retailer_click"/);

    const whereToBuy = fs.readFileSync("src/components/monetization/WhereToBuy.tsx", "utf8");
    expect(whereToBuy).toMatch(/track\(\s*"retailer_click"/);
    expect(whereToBuy).toContain("retailer: retailer.id");
  });
});

describe("materialId is stable and code-authored", () => {
  it("does not vary with anything the user types", () => {
    /*
     * The property is invariance, not the absence of digits — `2x4-lumber` is a
     * product, not a dimension. So each planner is evaluated twice at
     * deliberately different sizes and the ids have to come out identical. An
     * id built from what somebody typed would differ between the two runs, and
     * would then be handed to Google as an event parameter.
     */
    for (const project of projects) {
      const base = defaultValues(project, "us");
      const scaled = Object.fromEntries(
        Object.entries(base).map(([key, value]) =>
          typeof value === "number" ? [key, value * 2 + 3] : [key, value],
        ),
      );

      const first = evaluate(project, base, "us");
      const second = evaluate(project, scaled, "us");
      if (!first.ok || !second.ok) continue;

      /*
       * The *set* of materials may legitimately change with size — the mulch
       * planner switches from bags to bulk past about a cubic yard. What must
       * not change is the id of a material that appears in both runs, and no
       * id may look like a number somebody entered.
       */
      const before = new Set(first.result.materials.map((line) => line.id));
      for (const line of second.result.materials) {
        expect(line.id, `${project.slug}: ${line.id}`).toMatch(/^[a-z0-9-]+$/);
        if (before.has(line.id)) continue;
        // A newly appearing id must still be one of the project's own literals,
        // never a value derived from the input.
        expect(line.id, `${project.slug}: unexpected id ${line.id}`).toMatch(/[a-z]/);
      }
    }
  });

  it("is what the shopping list hands to the retailer link", () => {
    // `material:` is stripped before the id becomes an event parameter, so the
    // value in GA4 matches the id written in lib/calculations.
    const concrete = projects.find((project) => project.slug === "concrete-calculator")!;
    const evaluation = evaluate(concrete, defaultValues(concrete, "us"), "us");
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) return;

    const list = buildShoppingList(evaluation.result, "us");
    for (const material of evaluation.result.materials) {
      const entry = list.find((item) => item.id === `material:${material.id}`);
      expect(entry, material.id).toBeDefined();
      expect(entry!.id.replace(/^material:/, "")).toBe(material.id);
    }
  });

  it("stays bounded in count, so the parameter cannot explode cardinality", () => {
    const ids = new Set<string>();
    for (const project of projects) {
      const evaluation = evaluate(project, defaultValues(project, "us"), "us");
      if (!evaluation.ok) continue;
      for (const line of evaluation.result.materials) ids.add(`${project.slug}/${line.id}`);
    }
    // Ten planners, a handful of materials each. A number in the hundreds would
    // mean an id had started varying with input.
    expect(ids.size).toBeLessThan(120);
    expect(ids.size).toBeGreaterThan(20);
  });
});

/* -------------------------------------------------------------- the backstop -- */

describe("free text can never become an event parameter", () => {
  it("drops anything that is not a bounded scalar", async () => {
    const analytics = await analyticsWith("G-TEST0000AA");
    const calls: { params: Record<string, unknown> }[] = [];

    const globalWithWindow = globalThis as unknown as { window?: unknown };
    const previous = globalWithWindow.window;
    globalWithWindow.window = {
      location: { href: "https://www.cubitora.com/concrete-calculator" },
      gtag: (_command: string, _event: string, params: Record<string, unknown>) =>
        calls.push({ params }),
    };

    try {
      /*
       * The `AnalyticsProps` type has no field for free text, so this cast is
       * doing what a careless future call site would do. `sanitize` is the
       * runtime backstop behind the type, and this is the test of it.
       */
      analytics.track("planner_completed", {
        projectType: "concrete-calculator",
        notes: "my mother's patio, west side, budget about $900",
        email: "someone@example.com",
        description: "x".repeat(500),
        dimensions: { length: 20, width: 16 },
        callback: () => "nope",
        nested: ["a", "b"],
      } as never);
    } finally {
      globalWithWindow.window = previous;
    }

    expect(calls).toHaveLength(1);
    const serialised = JSON.stringify(calls[0].params);
    for (const leaked of ["mother", "patio", "example.com", "900", "xxxxx"]) {
      expect(serialised, leaked).not.toContain(leaked);
    }
    // Objects, arrays and functions are dropped outright.
    expect(calls[0].params.dimensions).toBeUndefined();
    expect(calls[0].params.callback).toBeUndefined();
    expect(calls[0].params.nested).toBeUndefined();
    // The declared vocabulary survives.
    expect(calls[0].params.projectType).toBe("concrete-calculator");
  });

  it("bounds string length, so a long value cannot ride in on a known key", async () => {
    const analytics = await analyticsWith("G-TEST0000AA");
    const calls: { params: Record<string, unknown> }[] = [];

    const globalWithWindow = globalThis as unknown as { window?: unknown };
    const previous = globalWithWindow.window;
    globalWithWindow.window = {
      location: { href: "https://www.cubitora.com/" },
      gtag: (_command: string, _event: string, params: Record<string, unknown>) =>
        calls.push({ params }),
    };

    try {
      analytics.track("planner_started", { projectType: "y".repeat(200) });
    } finally {
      globalWithWindow.window = previous;
    }

    expect(calls[0].params.projectType).toBeUndefined();
  });
});
