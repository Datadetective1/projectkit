import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sourceFromPath } from "@/lib/analytics";
import { redactPathname, redactUrl } from "@/lib/analytics/redact";

/**
 * GA4 wiring: the parts that can be proved without a browser.
 *
 * The browser half — that the seven events actually reach `dataLayer` with the
 * right parameters — lives in tests/e2e/analytics.spec.ts, which runs against a
 * server booted with a test measurement ID. What is checked here is the logic
 * that decides *what* gets sent, because that is where a privacy mistake would
 * originate.
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
     * The id is interpolated into an inline script and a script src, so a
     * half-filled or malformed variable must not become markup. Validating the
     * shape rather than the length is what makes that impossible.
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
    // gtag/js?id= with an empty id on every page.
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
});

describe("source is a closed vocabulary, never a path", () => {
  it("classifies the pages that matter", () => {
    expect(sourceFromPath("/")).toBe("home");
    expect(sourceFromPath("/projects")).toBe("projects");
    expect(sourceFromPath("/plan")).toBe("plan");
    expect(sourceFromPath("/concrete-calculator")).toBe("planner");
    expect(sourceFromPath("/concrete-calculator/10x10-slab")).toBe("answer");
    expect(sourceFromPath("/about")).toBe("other");
    expect(sourceFromPath("/project-pack/9f3c1b7e")).toBe("other");
  });

  it("never returns anything outside the vocabulary", () => {
    const allowed = new Set(["home", "planner", "answer", "projects", "plan", "other"]);
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
    ]) {
      expect(allowed.has(sourceFromPath(path)), `${path} → ${sourceFromPath(path)}`).toBe(true);
    }
  });

  it("cannot leak a query string even if handed one", () => {
    // The signature takes a pathname, but a caller could pass a full path with
    // a query. Whatever arrives, the output is one of six fixed tokens.
    expect(sourceFromPath("/plan?q=my+kitchen+remodel")).toBe("plan");
    expect(sourceFromPath("/concrete-calculator?length=20&width=16")).toBe("planner");
  });
});

describe("redaction still protects the page fields", () => {
  it("strips the dimensions a planner puts in the URL", () => {
    const redacted = redactUrl("https://www.cubitora.com/concrete-calculator?length=20&width=16");
    expect(redacted).not.toContain("length");
    expect(redacted).not.toContain("20");
    expect(redacted).toContain("/concrete-calculator");
  });

  it("strips a typed project description", () => {
    const redacted = redactUrl(
      "https://www.cubitora.com/plan?q=" + encodeURIComponent("a 20 by 16 concrete patio"),
    );
    expect(redacted).not.toMatch(/patio|concrete|20/);
  });

  it("collapses a saved-project id to its route pattern", () => {
    expect(redactPathname("/project-pack/9f3c1b7e-aa21-4d55-9f10-c0ffee123456")).toBe(
      "/project-pack/[id]",
    );
  });

  it("keeps campaign attribution, which is not user input", () => {
    const redacted = redactUrl("https://www.cubitora.com/?utm_source=bing&utm_campaign=launch");
    expect(redacted).toContain("utm_source=bing");
  });
});

describe("entry source reads the referrer, but only our own", () => {
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
    // The organic experiment's question: do answer pages feed the planner?
    const { entrySource } = await import("@/lib/analytics");
    withReferrer("https://www.cubitora.com/concrete-calculator/10x10-slab");
    expect(entrySource("/concrete-calculator")).toBe("answer");

    withReferrer("https://www.cubitora.com/");
    expect(entrySource("/concrete-calculator")).toBe("home");
  });

  it("never reports another site, however it arrived", async () => {
    /*
     * An external referrer is someone else's URL. It is not ours to record, it
     * can carry a search query, and it would explode the vocabulary — so it
     * collapses to `other`, which is honest about not knowing.
     */
    const { entrySource } = await import("@/lib/analytics");
    for (const referrer of [
      "https://www.google.com/search?q=how+much+concrete+for+a+10x10+slab",
      "https://www.bing.com/search?q=deck+cost",
      "https://www.cubitora.com.evil.example/concrete-calculator",
      "",
    ]) {
      withReferrer(referrer);
      expect(entrySource("/concrete-calculator"), referrer || "(empty referrer)").toBe("other");
    }
  });

  it("survives a malformed referrer", async () => {
    const { entrySource } = await import("@/lib/analytics");
    withReferrer("not a url");
    expect(entrySource("/concrete-calculator")).toBe("other");
  });
});
