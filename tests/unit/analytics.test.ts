import { describe, expect, it } from "vitest";
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
