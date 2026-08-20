# AI Discoverability

How Cubitora is made retrievable by search and answer engines, what was
deliberately *not* built, and how to check whether any of it is working.

Nothing here promises inclusion or citation. Allowing a crawler is permission,
not placement.

---

## Canonical identity

One host, everywhere: **`https://www.cubitora.com`**.

The apex `cubitora.com` 308-redirects to it. Google Search Console (Domain
property) and Bing Webmaster Tools have both already accepted
`https://www.cubitora.com/sitemap.xml`.

Entity consistency matters more for answer engines than for classic search —
a model reconciling "Cubitora" across sources needs one name and one URL, not
two. So the same host is used for canonicals, the sitemap, Open Graph, JSON-LD,
share links, and the robots sitemap declaration, and `site.domain` is the single
source all of them read.

> **This bit nearly went wrong.** `isProductionSite` originally compared the
> resolved site URL to the *apex*, by exact string. Production serves www, so
> the live site would have evaluated as "not production" and shipped
> `Disallow: /` plus a `noindex` on every page — silently removing a site the
> search engines had already accepted. It now compares by host and treats both
> hosts as production, because the inclusive failure (an indexable duplicate
> that self-corrects via canonical) is far cheaper than the exclusive one.

---

## Crawler policy

Two separate questions, answered separately in `src/app/robots.ts`.

### What is public

The ten planners, the marketing pages, and the legal pages.

Everything user-specific is closed to **every** crawler, including the AI ones:

| Path | Why |
| --- | --- |
| `/api/` | Checkout and the Stripe webhook |
| `/project-pack/` | Identifies one person's saved project |
| `/my-projects` | Reads a single browser's storage |
| `/plan` | Carries the description someone typed |

Two of those would leak a person's own input, which is the reason the rule is
applied per-agent rather than relying on the wildcard alone.

### Who may crawl it

Tokens verified against each provider's current documentation rather than from
memory — several changed names recently, and a stale token is a rule that
silently does nothing.

| Crawler | Purpose | Policy |
| --- | --- | --- |
| `Googlebot`, `Bingbot` | Search indexing | Allow (via `*`) |
| `OAI-SearchBot` | Surfaces sites in ChatGPT search | **Allow** |
| `Claude-SearchBot` | Improves Claude search results | **Allow** |
| `PerplexityBot` | Surfaces and links sites in Perplexity | **Allow** |
| `Claude-User` | A person asked Claude a question now | **Allow** |
| `Perplexity-User` | A person asked Perplexity a question now | **Allow** |
| `GPTBot` | Foundation-model training | **Disallow** |
| `ClaudeBot` | Foundation-model training | **Disallow** |

**The training decision is a business call, not a technical one, and it is
reversible in one line.** The reasoning: search and answer crawling sends people
back here and can cite the source; training crawling does neither, and the
validated calculation methodology is the product's differentiator. Delete
`TRAINING_CRAWLERS` in `robots.ts` to opt back in.

Note the near-miss this table is designed to prevent: `ClaudeBot` trains and
`Claude-SearchBot` surfaces. Blocking the wrong one costs referrals; allowing
the wrong one gives away the thing that was just declined. A unit test asserts
the two are not confused.

### Preview deployments

Closed entirely. A preview is a byte-identical copy of the site on a different
host, which is the textbook way to split your own ranking between two URLs.
`robots.txt` returns `Disallow: /` and every page carries `noindex` on any build
not serving a production host.

---

## llms.txt — deliberately not added

Investigated against current evidence. **The file is not justified.**

- Google confirmed no Search system reads or acts on `llms.txt`; June 2026
  documentation states it has no effect, positive or negative, on rankings or
  AI Overviews.
- No major provider — OpenAI, Google, Anthropic, Meta, Mistral — has publicly
  committed to reading it in production.
- Monitoring of 500M+ AI bot visits over 90 days found ~408 requests for it.
  An Ahrefs study of 137,000 sites found 97% of `llms.txt` files received zero
  traffic in May 2026.

Adding it would be harmless but would also be a file nobody reads, and it would
need maintaining in lockstep with the planner list or it would start lying.
Revisit if a major provider announces support.

**What actually makes the site retrievable is the next section.**

---

## Retrievable content

The real work, and the change with the most impact.

The planner is a client component behind Suspense. A crawler that does not
execute JavaScript previously saw an `h1`, a disclaimer, and the FAQ — **and
none of the formulas, assumptions, or rounding rules that are the substance of
the page.** An answer engine asked "how do you work out concrete for a patio?"
had nothing to retrieve.

`src/components/PlannerMethod.tsx` now renders the method as static HTML on
every planner, under headings that match how the question gets asked:

- **How the {planner} calculator works**
- **What it needs from you** — the required inputs
- **How it is calculated** — every formula, marked Exact or Assumption
- **Planning assumptions** — every default, with its value
- **What it does not tell you** — the limitations, verbatim from the engine

It runs the real calculation at default values on the server, so it cannot drift
from what the tool actually does. It is not SEO filler — the same deterministic
engine produces both.

Also in static HTML on every planner: `BreadcrumbList`, `WebApplication`, and
`FAQPage` JSON-LD; a single `h1`; the intro; the FAQ; and related-project links.

### Deterministic-calculation messaging

Consistently stated, because it is both true and the differentiator:

> Every number comes from plain, tested arithmetic in the application — not from
> a language model.

AI is used in exactly one place — reading a plain-English description to pick a
planner and extract numbers — and never to calculate. `/about` says so, the
method section says so, and the calculation audit backs it with sources.

---

## Measurement

No dashboard. These are the signals worth watching.

**Google Search Console** — impressions, clicks, CTR, queries, indexed pages.
Watch which planner pages get impressions: it shows which projects people search
for, which should inform what gets deepened.

**Bing Webmaster Tools** — impressions, clicks, indexed URLs. Also the path to
IndexNow when that gets built.

**Vercel Web Analytics** — landing pages, referrers, per-planner traffic,
country and device. Each planner reports as its own route.

**AI referrals** — identifiable by referrer in Vercel Analytics:

| Source | Referrer to look for |
| --- | --- |
| ChatGPT | `chatgpt.com`, `chat.openai.com` |
| Perplexity | `perplexity.ai` |
| Claude | `claude.ai` |

These are small numbers early and worth tracking as a trend rather than a total.

### Checking retrievability directly

Ask each assistant something Cubitora should be able to answer, with search
enabled, and see whether it finds and cites the site:

- "How much concrete do I need for a 20 by 16 patio?"
- "What's a good waste allowance for tile?"
- "How many fence posts for 150 feet?"

A useful control: fetch a planner with JavaScript disabled
(`curl https://www.cubitora.com/concrete-calculator`) and confirm the formulas
and assumptions are in the HTML. If they are not, no amount of crawler policy
will help.

---

## Deliberately not built

- **Hundreds of thin location or variant pages.** Ten planners that are right
  beats fifty that are unverified, and every new page needs the same
  source-checking the first ten got.
- **Fabricated reviews, ratings, offers, or testimonials** in structured data.
- **IndexNow** — planned as a separate task once this branch is approved.
