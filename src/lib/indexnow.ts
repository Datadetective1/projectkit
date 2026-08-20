import { projects } from "@/data/projects";
import { isProductionSite, site } from "@/config/site";

/**
 * IndexNow — telling search engines a page changed, instead of waiting to be
 * re-crawled.
 *
 * One POST to any participating engine is shared with the rest, so Bing,
 * Yandex, Seznam, Naver and others are covered by a single call. Google does
 * not participate; it still finds changes through the sitemap and normal
 * crawling, which is unaffected by any of this.
 *
 * Two rules shape everything below:
 *
 *  1. **Only canonical, public URLs.** The protocol rejects anything off-host
 *     (422), and submitting a page that is `noindex` or `Disallow`ed is worse
 *     than useless — it spends trust asking an engine to look at something we
 *     have told it not to. Private routes are filtered here as well as in
 *     robots.txt, because a single wrong argument to `submitUrls` should not be
 *     able to leak a saved-project id.
 *
 *  2. **It must never break anything.** This runs after a deploy or from a
 *     script. A rate-limited or unreachable endpoint is a non-event: the
 *     sitemap still exists and the crawler still comes. Nothing here throws.
 */

/**
 * The IndexNow key.
 *
 * Public by design — it is served at a public URL so engines can verify we
 * control the host. It is not a secret and committing it is correct; treating
 * it as one would mean the key file and the submitter could drift apart, which
 * is the one failure this protocol actually has (403).
 */
export const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY?.trim() || "7867c612427073f6032f348a6a670dd3";

/** Where engines fetch the key to verify ownership. */
export function keyFileUrl(): string {
  return `${site.url}/${INDEXNOW_KEY}.txt`;
}

/**
 * Endpoints. Any one of them propagates to the rest, so a single host is
 * enough; the second is a fallback for when the first is unreachable rather
 * than a second submission.
 */
const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

/** Paths that must never be submitted, mirroring the robots.txt disallow list. */
const PRIVATE_PREFIXES = ["/api/", "/project-pack/", "/my-projects", "/plan"];

/**
 * Every public page worth announcing.
 *
 * Derived from the project definitions rather than typed out, so a new planner
 * is included the day it ships and cannot be forgotten here. Deliberately the
 * same set the sitemap carries.
 */
export function publicUrls(): string[] {
  const paths = [
    "/",
    "/projects",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    ...projects.map((project) => `/${project.slug}`),
  ];
  return paths.map((path) => `${site.url}${path === "/" ? "" : path}`);
}

/**
 * Keep only canonical, public, submittable URLs.
 *
 * Rejects, in order: anything unparseable, anything not on the canonical host
 * (the protocol returns 422 and the whole batch is wasted), anything not HTTPS,
 * anything carrying a query string or fragment — a URL with `?q=` is someone's
 * typed description and is not a canonical page — and anything under a private
 * prefix. Duplicates are collapsed last.
 */
export function filterSubmittable(urls: string[]): {
  valid: string[];
  rejected: { url: string; reason: string }[];
} {
  /*
   * A preview build serves noindex pages and a robots.txt that disallows
   * everything. Submitting from one would ask an engine to index a deployment
   * we have explicitly told it to ignore, so nothing is submittable at all —
   * checked here rather than at the call site so no argument can bypass it.
   */
  if (!isProductionSite) {
    return {
      valid: [],
      rejected: urls.map((url) => ({ url, reason: "not a production build" })),
    };
  }

  const canonicalHost = new URL(site.url).host;
  const valid: string[] = [];
  const rejected: { url: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      rejected.push({ url: raw, reason: "not a valid absolute URL" });
      continue;
    }

    if (parsed.protocol !== "https:") {
      rejected.push({ url: raw, reason: "not https" });
      continue;
    }
    if (parsed.host !== canonicalHost) {
      rejected.push({ url: raw, reason: `not on ${canonicalHost}` });
      continue;
    }
    if (parsed.search || parsed.hash) {
      rejected.push({ url: raw, reason: "carries a query string or fragment" });
      continue;
    }
    const privateHit = PRIVATE_PREFIXES.find((prefix) =>
      prefix.endsWith("/")
        ? parsed.pathname.startsWith(prefix)
        : parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );
    if (privateHit) {
      rejected.push({ url: raw, reason: `private route (${privateHit})` });
      continue;
    }

    const normalised = parsed.toString();
    if (seen.has(normalised)) {
      rejected.push({ url: raw, reason: "duplicate" });
      continue;
    }
    seen.add(normalised);
    valid.push(normalised);
  }

  return { valid, rejected };
}

export interface SubmitResult {
  ok: boolean;
  /** HTTP status, or undefined when the endpoint could not be reached at all. */
  status?: number;
  endpoint?: string;
  submitted: string[];
  rejected: { url: string; reason: string }[];
  message: string;
}

/** What each documented status actually means for us. */
function describe(status: number): { ok: boolean; message: string } {
  switch (status) {
    case 200:
      return { ok: true, message: "Accepted." };
    case 202:
      return { ok: true, message: "Accepted; key validation pending." };
    case 400:
      return { ok: false, message: "Bad request — malformed submission." };
    case 403:
      return {
        ok: false,
        message: `Key rejected. Check ${keyFileUrl()} is reachable and contains exactly the key.`,
      };
    case 422:
      return {
        ok: false,
        message: "URLs do not belong to this host, or the key does not match.",
      };
    case 429:
      return { ok: false, message: "Rate limited — try again later, and submit less often." };
    default:
      return { ok: false, message: `Unexpected status ${status}.` };
  }
}

/**
 * Submit a set of URLs. Never throws.
 *
 * Tries endpoints in order and stops at the first that answers, because a
 * submission is shared between participating engines — sending to both would
 * be duplicate traffic, not wider coverage.
 */
export async function submitUrls(urls: string[]): Promise<SubmitResult> {
  const { valid, rejected } = filterSubmittable(urls);

  if (valid.length === 0) {
    return {
      ok: false,
      submitted: [],
      rejected,
      message: "Nothing submittable after filtering.",
    };
  }

  const body = JSON.stringify({
    host: new URL(site.url).host,
    key: INDEXNOW_KEY,
    keyLocation: keyFileUrl(),
    urlList: valid,
  });

  let lastMessage = "No endpoint could be reached.";

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const { ok, message } = describe(response.status);
      return { ok, status: response.status, endpoint, submitted: valid, rejected, message };
    } catch (error) {
      // Network failure or timeout. Try the next endpoint; if none answer, the
      // sitemap still exists and the crawler still comes.
      lastMessage = `${endpoint}: ${(error as Error).message}`;
    }
  }

  return { ok: false, submitted: valid, rejected, message: lastMessage };
}

/** Announce a single page — the usual case after editing one planner. */
export function submitUrl(url: string): Promise<SubmitResult> {
  return submitUrls([url]);
}

/** Announce every public page. For a first run or a site-wide change. */
export function submitAllPublicUrls(): Promise<SubmitResult> {
  return submitUrls(publicUrls());
}
