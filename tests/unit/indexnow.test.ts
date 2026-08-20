import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { projects } from "@/data/projects";

/**
 * IndexNow submission safety.
 *
 * The filter is the whole security surface here. A submission is a public
 * statement to several search engines that a URL exists and is worth indexing —
 * so a saved-project id or a typed project description reaching this list would
 * publish exactly the thing robots.txt exists to keep private.
 *
 * Every test loads the module against the production host, because the host is
 * what the filter is checking against and a localhost default would make the
 * whole suite vacuously pass.
 */

const ORIGINAL = { ...process.env };
const PRODUCTION = "https://www.cubitora.com";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

async function indexnowOn(siteUrl = PRODUCTION) {
  vi.resetModules();
  process.env = { ...ORIGINAL, NEXT_PUBLIC_SITE_URL: siteUrl };
  return import("@/lib/indexnow");
}

describe("the key", () => {
  it("matches the file served at the site root", async () => {
    /*
     * The one failure this protocol really has is 403: the key in the
     * submission and the key in the file disagree. The file has to be static
     * (the spec requires it at the root, where a route collides with the
     * planner slug route), so this test is what stops the two drifting.
     */
    const { INDEXNOW_KEY } = await indexnowOn();
    const served = readFileSync(`public/${INDEXNOW_KEY}.txt`, "utf8").trim();
    expect(served).toBe(INDEXNOW_KEY);
  });

  it("is a valid key by the specification", async () => {
    // 8–128 characters, drawn from a–z, A–Z, 0–9 and dashes.
    const { INDEXNOW_KEY } = await indexnowOn();
    expect(INDEXNOW_KEY.length).toBeGreaterThanOrEqual(8);
    expect(INDEXNOW_KEY.length).toBeLessThanOrEqual(128);
    expect(INDEXNOW_KEY).toMatch(/^[a-zA-Z0-9-]+$/);
  });

  it("declares its location on the canonical host, at the root", async () => {
    // A key file in a subdirectory restricts submissions to that subdirectory,
    // which would make every page here unsubmittable.
    const { INDEXNOW_KEY, keyFileUrl } = await indexnowOn();
    expect(keyFileUrl()).toBe(`${PRODUCTION}/${INDEXNOW_KEY}.txt`);
    expect(new URL(keyFileUrl()).pathname).toBe(`/${INDEXNOW_KEY}.txt`);
  });
});

describe("what gets submitted", () => {
  it("covers every planner, derived rather than listed", async () => {
    const { publicUrls } = await indexnowOn();
    const urls = publicUrls();
    for (const project of projects) {
      expect(urls, project.slug).toContain(`${PRODUCTION}/${project.slug}`);
    }
    // The homepage is the bare origin, not a trailing slash.
    expect(urls).toContain(PRODUCTION);
  });

  it("submits only the canonical www host", async () => {
    const { filterSubmittable } = await indexnowOn();
    const { valid, rejected } = filterSubmittable([
      `${PRODUCTION}/concrete-calculator`,
      "https://cubitora.com/concrete-calculator",
      "https://projectkit-git-x.vercel.app/concrete-calculator",
      "https://www.cubitora.com.evil.example/concrete-calculator",
    ]);

    expect(valid).toEqual([`${PRODUCTION}/concrete-calculator`]);
    // The apex 308s to www; submitting it spends the batch on a 422.
    expect(rejected.map((entry) => entry.url)).toEqual([
      "https://cubitora.com/concrete-calculator",
      "https://projectkit-git-x.vercel.app/concrete-calculator",
      "https://www.cubitora.com.evil.example/concrete-calculator",
    ]);
  });

  it("never submits a private route", async () => {
    const { filterSubmittable } = await indexnowOn();
    const { valid, rejected } = filterSubmittable([
      `${PRODUCTION}/api/checkout`,
      `${PRODUCTION}/project-pack/9f3c1b7e-aa21-4d55-9f10-c0ffee123456`,
      `${PRODUCTION}/my-projects`,
      `${PRODUCTION}/plan`,
    ]);

    expect(valid).toEqual([]);
    expect(rejected).toHaveLength(4);
    for (const entry of rejected) {
      expect(entry.reason, entry.url).toMatch(/private route/);
    }
  });

  it("never submits a URL carrying user input", async () => {
    // /plan?q=… is someone's typed project description and a prefilled planner
    // URL is their measurements. Neither is a canonical page.
    const { filterSubmittable } = await indexnowOn();
    const { valid, rejected } = filterSubmittable([
      `${PRODUCTION}/plan?q=${encodeURIComponent("a 20 by 16 concrete patio")}`,
      `${PRODUCTION}/concrete-calculator?length=20&width=16`,
      `${PRODUCTION}/project-pack/abc123?session_id=cs_test_x`,
      `${PRODUCTION}/concrete-calculator#results`,
    ]);

    expect(valid).toEqual([]);
    expect(rejected).toHaveLength(4);
  });

  it("rejects http and unparseable input rather than sending it", async () => {
    const { filterSubmittable } = await indexnowOn();
    const { valid, rejected } = filterSubmittable([
      "http://www.cubitora.com/concrete-calculator",
      "not a url",
      "",
      "/concrete-calculator",
    ]);

    expect(valid).toEqual([]);
    expect(rejected).toHaveLength(4);
  });

  it("collapses duplicates", async () => {
    const { filterSubmittable } = await indexnowOn();
    const { valid, rejected } = filterSubmittable([
      `${PRODUCTION}/concrete-calculator`,
      `${PRODUCTION}/concrete-calculator`,
      `${PRODUCTION}/fence-calculator`,
    ]);

    expect(valid).toHaveLength(2);
    expect(rejected.filter((entry) => entry.reason === "duplicate")).toHaveLength(1);
  });

  it("passes the real public list through its own filter unchanged", async () => {
    // The list the CLI submits by default must survive the safety filter
    // completely, or one of the two is wrong.
    const { filterSubmittable, publicUrls } = await indexnowOn();
    const { valid, rejected } = filterSubmittable(publicUrls());
    expect(rejected).toEqual([]);
    expect(valid).toHaveLength(publicUrls().length);
  });

  it("submits nothing that robots.txt disallows", async () => {
    const { publicUrls } = await indexnowOn();
    const disallowed = ["/api/", "/project-pack/", "/my-projects", "/plan"];
    for (const url of publicUrls()) {
      const path = new URL(url).pathname;
      for (const prefix of disallowed) {
        expect(path.startsWith(prefix), `${path} is disallowed by robots`).toBe(false);
      }
    }
  });

  it("refuses to submit anything at all from a preview build", async () => {
    /*
     * A preview serves noindex pages behind a robots.txt that disallows
     * everything. Announcing them would ask an engine to index a deployment we
     * have explicitly told it to ignore — and the preview host is where a
     * misfiring deploy hook would most plausibly run.
     */
    const preview = "https://projectkit-git-cubitora-design-x.vercel.app";
    const { filterSubmittable, publicUrls } = await indexnowOn(preview);

    // Its own URLs, and the production ones, are both refused.
    expect(filterSubmittable(publicUrls()).valid).toEqual([]);
    expect(filterSubmittable([`${PRODUCTION}/concrete-calculator`]).valid).toEqual([]);
  });
});

describe("submitting", () => {
  it("does not reach the network when nothing survives filtering", async () => {
    const { submitUrls } = await indexnowOn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await submitUrls([`${PRODUCTION}/my-projects`]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.submitted).toEqual([]);
    fetchSpy.mockRestore();
  });

  it("sends the host, key and key location the specification requires", async () => {
    const { INDEXNOW_KEY, submitUrl } = await indexnowOn();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 200 }));

    const result = await submitUrl(`${PRODUCTION}/concrete-calculator`);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      host: "www.cubitora.com",
      key: INDEXNOW_KEY,
      keyLocation: `${PRODUCTION}/${INDEXNOW_KEY}.txt`,
      urlList: [`${PRODUCTION}/concrete-calculator`],
    });
    fetchSpy.mockRestore();
  });

  it("reports a rejection instead of claiming success", async () => {
    // 403 means the key file did not verify. Reporting that as "submitted"
    // would hide the only failure this protocol actually has.
    const { submitUrl } = await indexnowOn();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 403 }));

    const result = await submitUrl(`${PRODUCTION}/concrete-calculator`);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.message).toMatch(/key/i);
    fetchSpy.mockRestore();
  });

  it("never throws when the endpoints are unreachable", async () => {
    // This may run from a deploy hook. A network failure is a non-event: the
    // sitemap still exists and the crawler still comes.
    const { submitUrl } = await indexnowOn();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("ENOTFOUND"));

    const result = await submitUrl(`${PRODUCTION}/concrete-calculator`);

    expect(result.ok).toBe(false);
    expect(result.status).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2); // tried both endpoints
    fetchSpy.mockRestore();
  });
});
