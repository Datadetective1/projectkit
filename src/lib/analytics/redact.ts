/**
 * URL redaction for analytics.
 *
 * Almost every query parameter Cubitora puts in a URL is something the user
 * typed — slab dimensions, room counts, prices, a natural-language description,
 * a saved-project id, a Stripe session id. None of it belongs in an analytics
 * pipeline: it is user data, it tells us nothing a route name doesn't, and it
 * would explode URL cardinality in the routes report.
 *
 * So the rule is inverted from the usual "block a denylist": everything is
 * stripped except a short allowlist of parameters that are known to carry no
 * user input and to actually mean something for attribution.
 *
 * Path segments that identify a single user's record are replaced with the
 * route pattern, so `/project-pack/9f3c…` reports as `/project-pack/[id]`.
 */

/**
 * Query parameters that survive redaction.
 *
 * - `utm_*`, `ref`, `gclid`, `fbclid` — campaign attribution, set by the
 *   referring site rather than by the user.
 * - `from` — Cubitora's own marker for "arrived via the natural-language
 *   router". A fixed token (`nl`), not user input, and genuinely useful.
 */
const ALLOWED_PARAMS = new Set(["ref", "gclid", "fbclid", "from"]);
const ALLOWED_PARAM_PREFIXES = ["utm_"];

/** Values `from` is allowed to take. Anything else is dropped. */
const ALLOWED_FROM_VALUES = new Set(["nl"]);

/** Longest value we will keep for an allowed parameter. */
const MAX_PARAM_LENGTH = 64;

/**
 * Path patterns whose dynamic segment identifies one user's record. Reported as
 * the route rather than the resolved path.
 */
const DYNAMIC_ROUTES: { pattern: RegExp; replacement: string }[] = [
  { pattern: /^\/project-pack\/[^/]+\/?$/, replacement: "/project-pack/[id]" },
];

function isAllowedParam(key: string): boolean {
  const lower = key.toLowerCase();
  if (ALLOWED_PARAMS.has(lower)) return true;
  return ALLOWED_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/** Collapse a per-user path into its route pattern. */
export function redactPathname(pathname: string): string {
  for (const { pattern, replacement } of DYNAMIC_ROUTES) {
    if (pattern.test(pathname)) return replacement;
  }
  return pathname;
}

/**
 * Strip user input from a URL, leaving a route and any attribution parameters.
 * Returns the input unchanged if it cannot be parsed — never throws, because a
 * redaction failure must not break the page.
 */
export function redactUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);

    url.pathname = redactPathname(url.pathname);

    const kept = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (!isAllowedParam(key)) continue;
      if (value.length > MAX_PARAM_LENGTH) continue;
      if (key.toLowerCase() === "from" && !ALLOWED_FROM_VALUES.has(value)) continue;
      kept.append(key, value);
    }

    url.search = kept.toString();
    // A fragment is client-only and can carry anything; drop it.
    url.hash = "";

    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * `beforeSend` for the Vercel Analytics component. Redacts rather than drops,
 * so page views still count — we just do not learn what the user typed.
 */
export function redactAnalyticsEvent<T extends { url: string }>(event: T): T {
  return { ...event, url: redactUrl(event.url) };
}
