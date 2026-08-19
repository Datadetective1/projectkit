import { describe, expect, it, vi } from "vitest";
import {
  redactAnalyticsEvent,
  redactPathname,
  redactUrl,
} from "@/lib/analytics/redact";

const ORIGIN = "https://projectkit-beta.vercel.app";

/**
 * These are privacy tests, not formatting tests. Every case below is a real URL
 * ProjectKit produces, and the assertion is that nothing the user typed reaches
 * the analytics pipeline.
 */

describe("stripping user input from URLs", () => {
  it("removes the natural-language description", () => {
    const url = `${ORIGIN}/plan?q=${encodeURIComponent("I want a 20 by 16 concrete patio")}`;
    const redacted = redactUrl(url);

    expect(redacted).toBe(`${ORIGIN}/plan`);
    expect(redacted).not.toContain("concrete");
    expect(redacted).not.toContain("20");
  });

  it("removes prefilled dimensions from a planner URL", () => {
    const redacted = redactUrl(
      `${ORIGIN}/concrete-calculator?length=20&width=16&thickness=6&from=nl`,
    );

    // The route and the "arrived via natural language" marker survive.
    expect(redacted).toBe(`${ORIGIN}/concrete-calculator?from=nl`);
    expect(redacted).not.toContain("length");
    expect(redacted).not.toContain("width");
    expect(redacted).not.toContain("thickness");
  });

  it("removes prices and every other planner parameter", () => {
    const redacted = redactUrl(
      `${ORIGIN}/fence-calculator?concretePrice=185&picketPrice=4.25&gateCount=2&units=metric`,
    );
    expect(redacted).toBe(`${ORIGIN}/fence-calculator`);
  });

  it("removes a Stripe checkout session id", () => {
    const redacted = redactUrl(
      `${ORIGIN}/project-pack/9f3c1e2a-1111-2222-3333-444455556666?session_id=cs_test_a1B2c3D4`,
    );
    expect(redacted).not.toContain("cs_test");
    expect(redacted).not.toContain("session_id");
  });

  it("collapses a saved-project id into its route", () => {
    expect(redactUrl(`${ORIGIN}/project-pack/9f3c1e2a-1111-2222-3333-444455556666`)).toBe(
      `${ORIGIN}/project-pack/[id]`,
    );
    // Trailing slash is the same route.
    expect(redactUrl(`${ORIGIN}/project-pack/abc123/`)).toBe(`${ORIGIN}/project-pack/[id]`);
  });

  it("removes the fragment, which can carry anything", () => {
    expect(redactUrl(`${ORIGIN}/concrete-calculator#what-the-user-typed`)).toBe(
      `${ORIGIN}/concrete-calculator`,
    );
  });

  it("removes a saved-project reference from a planner URL", () => {
    expect(redactUrl(`${ORIGIN}/concrete-calculator?saved=9f3c1e2a-1111`)).toBe(
      `${ORIGIN}/concrete-calculator`,
    );
  });
});

describe("keeping what is useful", () => {
  it("keeps the pathname of every planner route", () => {
    for (const slug of [
      "concrete-calculator",
      "fence-calculator",
      "paint-calculator",
      "flooring-calculator",
      "mulch-calculator",
      "gravel-calculator",
      "drywall-calculator",
      "tile-calculator",
      "deck-calculator",
      "sod-calculator",
      "projects",
      "my-projects",
      "about",
    ]) {
      expect(redactUrl(`${ORIGIN}/${slug}`)).toBe(`${ORIGIN}/${slug}`);
    }
    expect(redactUrl(`${ORIGIN}/`)).toBe(`${ORIGIN}/`);
  });

  it("keeps campaign attribution parameters", () => {
    const redacted = redactUrl(
      `${ORIGIN}/concrete-calculator?utm_source=reddit&utm_medium=social&utm_campaign=launch&length=20`,
    );
    expect(redacted).toContain("utm_source=reddit");
    expect(redacted).toContain("utm_medium=social");
    expect(redacted).toContain("utm_campaign=launch");
    expect(redacted).not.toContain("length");
  });

  it("keeps click identifiers used for ad attribution", () => {
    expect(redactUrl(`${ORIGIN}/?gclid=abc123`)).toContain("gclid=abc123");
    expect(redactUrl(`${ORIGIN}/?ref=producthunt`)).toContain("ref=producthunt");
  });

  it("keeps only the known value of the natural-language marker", () => {
    expect(redactUrl(`${ORIGIN}/concrete-calculator?from=nl`)).toContain("from=nl");
    // An arbitrary value could be user input smuggled through a known key.
    expect(redactUrl(`${ORIGIN}/concrete-calculator?from=my-secret-note`)).toBe(
      `${ORIGIN}/concrete-calculator`,
    );
  });

  it("drops an allowed parameter carrying an implausibly long value", () => {
    const long = "x".repeat(200);
    expect(redactUrl(`${ORIGIN}/?utm_source=${long}`)).toBe(`${ORIGIN}/`);
  });

  it("matches allowed parameters regardless of case", () => {
    expect(redactUrl(`${ORIGIN}/?UTM_Source=reddit`)).toContain("reddit");
  });
});

describe("robustness", () => {
  it("returns the input unchanged rather than throwing on a malformed URL", () => {
    expect(redactUrl("not-a-url")).toBe("not-a-url");
    expect(redactUrl("")).toBe("");
  });

  it("never throws on hostile input", () => {
    const inputs = [
      `${ORIGIN}/?q=${"%".repeat(50)}`,
      `${ORIGIN}/${"a".repeat(5000)}`,
      `${ORIGIN}/?a=1&a=2&a=3`,
      "javascript:alert(1)",
      `${ORIGIN}/?<script>alert(1)</script>=x`,
    ];
    for (const input of inputs) {
      expect(() => redactUrl(input)).not.toThrow();
    }
  });

  it("leaves an already-clean URL untouched", () => {
    const clean = `${ORIGIN}/concrete-calculator`;
    expect(redactUrl(clean)).toBe(clean);
  });
});

describe("pathname redaction", () => {
  it("only collapses per-user routes", () => {
    expect(redactPathname("/project-pack/abc")).toBe("/project-pack/[id]");
    expect(redactPathname("/concrete-calculator")).toBe("/concrete-calculator");
    expect(redactPathname("/projects")).toBe("/projects");
    expect(redactPathname("/")).toBe("/");
  });
});

describe("the beforeSend hook", () => {
  it("redacts the URL and preserves the rest of the event", () => {
    const event = {
      type: "pageview" as const,
      url: `${ORIGIN}/concrete-calculator?length=20&width=16`,
    };
    const sent = redactAnalyticsEvent(event);

    expect(sent.type).toBe("pageview");
    expect(sent.url).toBe(`${ORIGIN}/concrete-calculator`);
  });

  it("redacts rather than dropping, so page views still count", () => {
    const event = { type: "pageview" as const, url: `${ORIGIN}/plan?q=anything` };
    expect(redactAnalyticsEvent(event)).not.toBeNull();
  });

  it("does not mutate the event it was given", () => {
    const event = { type: "pageview" as const, url: `${ORIGIN}/x?length=20` };
    redactAnalyticsEvent(event);
    expect(event.url).toBe(`${ORIGIN}/x?length=20`);
  });
});

/* ------------------------------------------- the Google Analytics pipeline -- */

/**
 * The redaction above only protects the Vercel pipeline, which routes every
 * event through `beforeSend`. Google Analytics has no such hook: GA4 stamps
 * `page_location` onto every event by reading `document.location.href`
 * directly, and on a planner URL that href *is* the user's dimensions.
 *
 * These tests call the real `track`/`trackPageView` against a stub gtag and
 * assert on what would actually go over the wire.
 */
describe("the Google Analytics pipeline", () => {
  const LEAKY = `${ORIGIN}/concrete-calculator?length=20&width=16&thickness=6&pricePerCubicYard=165`;

  type GtagCall = [string, string, Record<string, unknown>];

  async function captureGtag(
    href: string,
    run: (api: typeof import("@/lib/analytics")) => void,
  ): Promise<GtagCall[]> {
    const calls: GtagCall[] = [];
    vi.resetModules();
    vi.doMock("@/config/site", () => ({
      analyticsConfig: { measurementId: "G-TEST", vercelCustomEvents: false, debug: false },
    }));

    const globalWithWindow = globalThis as unknown as { window?: unknown };
    const previousWindow = globalWithWindow.window;
    globalWithWindow.window = {
      location: { href },
      gtag: (...args: unknown[]) => calls.push(args as GtagCall),
    };

    try {
      run(await import("@/lib/analytics"));
    } finally {
      globalWithWindow.window = previousWindow;
      vi.doUnmock("@/config/site");
      vi.resetModules();
    }
    return calls;
  }

  it("overrides page_location on a page view so the query string cannot ride along", async () => {
    const calls = await captureGtag(LEAKY, (analytics) =>
      analytics.trackPageView("/concrete-calculator"),
    );

    expect(calls).toHaveLength(1);
    const [, event, payload] = calls[0];
    expect(event).toBe("page_view");
    // Present at all — leaving it unset is what makes GA4 read the real href.
    expect(payload.page_location).toBeDefined();
    expect(String(payload.page_location)).not.toContain("length");
    expect(String(payload.page_location)).not.toContain("165");
    expect(payload.page_location).toBe(`${ORIGIN}/concrete-calculator`);
    expect(payload.page_path).toBe("/concrete-calculator");
  });

  it("overrides page_location on custom events too", async () => {
    const calls = await captureGtag(LEAKY, (analytics) =>
      analytics.track("result_viewed", { projectType: "concrete-calculator", mode: "advanced" }),
    );

    expect(calls).toHaveLength(1);
    const [, event, payload] = calls[0];
    expect(event).toBe("result_viewed");
    expect(payload.page_location).toBe(`${ORIGIN}/concrete-calculator`);
    // The closed-vocabulary props still come through untouched.
    expect(payload.projectType).toBe("concrete-calculator");
    expect(payload.mode).toBe("advanced");
  });

  it("collapses a saved-project id rather than sending it to Google", async () => {
    const calls = await captureGtag(`${ORIGIN}/project-pack/9f3c1b7e-aa21-4d55-9f10-c0ffee123456`, (analytics) =>
      analytics.trackPageView("/project-pack/9f3c1b7e-aa21-4d55-9f10-c0ffee123456"),
    );

    const [, , payload] = calls[0];
    expect(payload.page_path).toBe("/project-pack/[id]");
    expect(payload.page_location).toBe(`${ORIGIN}/project-pack/[id]`);
    expect(JSON.stringify(payload)).not.toContain("9f3c1b7e");
  });

  it("sends nothing at all when no measurement id is configured", async () => {
    const calls: GtagCall[] = [];
    vi.resetModules();
    vi.doMock("@/config/site", () => ({
      analyticsConfig: { measurementId: "", vercelCustomEvents: false, debug: false },
    }));

    const globalWithWindow = globalThis as unknown as { window?: unknown };
    const previousWindow = globalWithWindow.window;
    globalWithWindow.window = {
      location: { href: LEAKY },
      gtag: (...args: unknown[]) => calls.push(args as GtagCall),
    };

    try {
      const analytics = await import("@/lib/analytics");
      analytics.trackPageView("/concrete-calculator");
      analytics.track("result_viewed", { projectType: "concrete-calculator" });
      expect(calls).toHaveLength(0);
    } finally {
      globalWithWindow.window = previousWindow;
      vi.doUnmock("@/config/site");
      vi.resetModules();
    }
  });
});
