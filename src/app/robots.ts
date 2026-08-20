import type { MetadataRoute } from "next";
import { isProductionSite } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";

/**
 * Crawler policy.
 *
 * Two separate questions, answered separately:
 *
 *  1. **What is public?** The ten planners, the marketing pages, and the legal
 *     pages. Everything user-specific is not: a saved project lives under
 *     /project-pack/<id>, /my-projects reads one browser's storage, /plan
 *     carries the description someone typed, and /api/ includes checkout and
 *     the Stripe webhook. None of those have anything a crawler should hold,
 *     and two of them would leak a person's own input.
 *
 *  2. **Who may crawl it?** Search and discovery crawlers are welcome — being
 *     retrievable is the point. Model-training crawlers are declined. That is a
 *     deliberate business call rather than a technical one, and it is a
 *     reversible one: search crawling sends people back here and can cite us,
 *     training crawling does neither, and the validated calculation
 *     methodology is the product's differentiator. Flip TRAINING_CRAWLERS to
 *     change the answer.
 *
 * User-agent tokens verified against each provider's current documentation
 * rather than from memory — several of these changed names in the last two
 * years, and a stale token is a rule that silently does nothing.
 */

/** Everything user-specific. Applied to every crawler, including the AI ones. */
const PRIVATE_PATHS = ["/api/", "/project-pack/", "/my-projects", "/plan"];

/**
 * Crawlers that surface pages in a search result or answer, with a link back.
 *
 *  - OAI-SearchBot   — surfaces sites in ChatGPT's search features
 *  - Claude-SearchBot — improves search result quality in Claude
 *  - PerplexityBot   — surfaces and links sites in Perplexity results
 *
 * Googlebot and Bingbot are covered by the wildcard rule and need no entry.
 */
const SEARCH_CRAWLERS = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"];

/**
 * Fetches made because a person asked a question right now. Same standing as a
 * browser: someone wants an answer about their patio, and the page is public.
 */
const USER_AGENT_CRAWLERS = ["Claude-User", "Perplexity-User"];

/**
 * Crawlers collecting content for foundation-model training. Declined — see
 * the policy note above. Removing this list opts back in.
 */
const TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot"];

export default function robots(): MetadataRoute.Robots {
  /*
   * Preview and local builds are closed entirely. They are byte-identical
   * copies of the site on a different host, which is the textbook way to split
   * your own ranking between two URLs.
   */
  if (!isProductionSite) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      ...[...SEARCH_CRAWLERS, ...USER_AGENT_CRAWLERS].map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
      ...TRAINING_CRAWLERS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
