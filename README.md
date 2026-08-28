# Cubitora

**Plan the project. Know what you need.**

**Live:** <https://www.cubitora.com>

Cubitora turns a home improvement project into material quantities, an
estimated budget, a shopping list, an order of operations, and a printable
Project Pack. It is a project-completion utility, not a calculator directory.

```
Project idea → details → deterministic calculation → quantities with waste
→ purchase rounding → estimated cost → shopping list → project steps
→ scenario comparison → printable Project Pack
```

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment file is needed. With an empty `.env`, all ten planners, saved
projects, the shopping list, and the Project Pack (preview **and** PDF) work.
Copy `.env.example` to `.env.local` to switch on the optional pieces.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs TypeScript) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run e2e` | Playwright journeys + accessibility, Chromium and WebKit |
| `npm run check` | lint + typecheck + unit tests |

`npm run e2e` builds and serves the app itself on port 3100. First run needs
`npx playwright install chromium webkit`.

---

## The rule that shapes everything

**An LLM is never the source of truth for a number.**

AI is used in exactly one place: reading a plain-English description and
proposing which planner to open and which measurements were mentioned. Its
output is validated against a schema, mapped onto known fields, and shown to
the user for correction. Every quantity, cost, and rounding decision comes from
plain, unit-tested arithmetic in `src/lib/calculations/`.

The natural-language box also has a deterministic parser that runs first and
handles the common phrasings on its own, so the feature works with no API key
at all.

---

## Architecture

```
src/
  app/                    Routes. /[slug] renders any planner from the registry.
  components/
    planner/              The interactive form (client)
    results/              Result panel, shopping list, steps, DIY-vs-hire
    pack/                 Project Pack preview + react-pdf document
    monetization/         Retailer links and the Amazon disclosure
  config/site.ts          Brand, pricing, feature flags, legal copy
  config/retailers.ts     Amazon Associates; every other retailer env-gated
  data/projects/          One definition per project + the registry
  lib/
    calc/engine.ts        Defaults, validation, unit conversion, evaluation
    calculations/         One pure calculation per project — the real logic
    shopping/groups.ts    Parcel or truck — the one rule three surfaces share
    units.ts              Canonical-US maths, metric display, formatting
    pricing.ts            Planning price book and shared assumptions
    ai/                   Deterministic parser, then optional Claude extraction
    storage/              localStorage saved projects as a React external store
  types/project.ts        ProjectDefinition, CalculationResult, and friends
tests/
  unit/                   Vitest: units, engine, all ten calculations, parser
  e2e/                    Playwright: nine journeys + axe accessibility audits
```

### How a project works

A `ProjectDefinition` is data: inputs, a pure `calculate` function, steps, FAQs,
related projects, and SEO copy. Everything else — routing, the form, validation,
results, the shopping list, saving, sharing, the Project Pack, the sitemap — is
driven off that definition. There is one planner page, not ten.

### The post-calculation page

The results column is ordered `CALCULATE → UNDERSTAND → SHOP → DEEPER`:

```
Headline number
"Here's what you need"   cost · list length · how much ships · difficulty
                         [Shop these materials] [View full project plan]
Project summary
Materials
Shopping list            grouped: ready to buy · order locally · tools
———
Compare options · What this means · How it was calculated
Project Pack · Sequence · DIY or hire · What if · Save & share
```

This order is the product of user research, not taste. The shopping list used
to be the tenth of fourteen blocks, and the only shopping affordance near the
top was a "Shop materials" button that opened a **Google search** —
`affiliateConfig` defaults to one when no partner is configured. Users reported
liking the calculators and never realising Cubitora could help them buy
anything; the page was the reason. Everything that *explains* the answer now
sits below the thing to *do* about it, and the Project Pack remains one click
away rather than a toll gate in front of shopping.

**Not every project can be shopped.** `lib/shopping/groups.ts` decides what a
parcel carrier can realistically deliver: goods sold by the cubic yard, by the
ton, or by the linear foot arrive on a truck from a local yard, and sod is a
perishable crop. Three planners — mulch, gravel and sod — therefore have
*nothing* to buy online, so the primary button becomes "View shopping list" and
promises quantities to take to a supplier instead of opening an empty sheet.
That one rule is exported once and consumed by the card that counts items, the
list that groups them, and the mobile bar that repeats the count, so the three
can never disagree.

### Units

All arithmetic happens in one canonical system (US customary: feet, inches,
square feet, cubic feet and yards, short tons). Metric values are converted at
the boundary, so each formula is written once and tested once.

The unit toggle anchors to the value you actually typed rather than the rounded
value on screen, so switching back and forth returns exactly `20`, not
`15.999`. Results always reflect the numbers currently visible in the form.

### Adding project #11

Three files, no framework changes:

```ts
// 1. src/lib/calculations/skirting.ts — a pure function
export function calculateSkirting({ values, unitSystem }: CalculationContext): CalculationResult {
  const perimeter = 2 * (num(values, "length") + num(values, "width"));
  const withWaste = perimeter * wasteMultiplier(num(values, "waste"));
  // …return headline, summary, materials, scenarios, formulas, assumptions,
  //   explanation, shoppingExtras, warnings, effort
}

// 2. src/data/projects/skirting.ts — the definition
export const skirtingProject: ProjectDefinition = {
  slug: "skirting-calculator",
  name: "Skirting",
  inputs: [ /* number | select | toggle, each tier: "quick" | "advanced" */ ],
  calculate: calculateSkirting,
  steps: [...], faq: [...], related: [...], seo: {...}, keywords: [...],
};

// 3. src/data/projects/index.ts — add it to the array
export const projects = [ concreteProject, /* … */ skirtingProject ];
```

The route, sitemap entry, structured data, breadcrumbs, form, validation,
results, shopping list, save/share, and Project Pack all appear automatically.
Add a `describe` block in `tests/unit/calculations.test.ts` and the slug to
`PLANNER_SLUGS` in the E2E suite.

### Deliberately not built: variant pages

Pages like `/concrete/patio` or `/paint/bedroom` are a natural next step for
search, and the registry is shaped to support them: add a `variants` array to
`ProjectDefinition` (a label, a slug, prefilled input values, and its own SEO
copy), then a `app/[slug]/[variant]/page.tsx` route that reads it and hands the
same `ProjectPlanner` a prefill.

They are not built because a variant page only earns its place if it says
something a slider on the main page cannot — a driveway needs different
thickness *and* different reinforcement advice, a bedroom repaint has different
coverage assumptions. Generating ten near-identical pages per planner would
inflate the page count and dilute every one of them.

---

## Optional integrations

Every one of these degrades to something honest rather than breaking.

| Integration | Without it |
| --- | --- |
| **Anthropic** (`ANTHROPIC_API_KEY`) | The deterministic parser handles the natural-language box; every planner works by hand regardless. |
| **Stripe** (`STRIPE_SECRET_KEY`) | `NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK=true` unlocks the Project Pack locally; it is off unless explicitly set, and the server refuses it on production deployments regardless. Without the flag and without a key, checkout explains that payments are not configured. Live keys are refused unless `STRIPE_ALLOW_LIVE_MODE=true`. |
| **Google Analytics** (`NEXT_PUBLIC_ANALYTICS_ID`) | No script loads, no `dataLayer`, no request to googletagmanager, and every `track()` call is a no-op. Vercel Web Analytics is separate and keeps working. |
| **Ads** (`NEXT_PUBLIC_ADS_ENABLED`) | Ad slots render nothing. They never sit inside a calculator and reserve fixed height so they cannot shift layout. |
| **Affiliate** (`NEXT_PUBLIC_AFFILIATE_SEARCH_URL`) | "Shop materials" points at a plain web search — nothing implies a retailer relationship that does not exist. |

---

## Analytics

**Vercel Web Analytics**, integrated once in `src/app/layout.tsx` via
`src/components/analytics/VercelAnalytics.tsx`. It covers the whole app,
including client-side navigation, and needs no environment variables.

Collected automatically: visitors, page views, routes, referrers, countries,
devices, browsers, and operating systems. Vercel separates production, preview,
and local traffic on its own — nothing here hard-codes a hostname or labels
localhost as production.

### Why the `/react` entry point, not `/next`

All ten planners share the dynamic `app/[slug]` route. `@vercel/analytics/next`
derives the reported route from `useParams()`, so every calculator would land in
the dashboard as a single `/[slug]` row — "which calculator gets the most
traffic?" would have no answer. The wrapper reports the pathname instead, so
`/concrete-calculator` and `/fence-calculator` stay distinct, and only
`/project-pack/<id>` is deliberately grouped to its route pattern.

### Privacy

Nearly every query parameter Cubitora puts in a URL is something the user
typed — slab dimensions, room counts, prices, a natural-language description, a
saved-project id, a Stripe session id. A `beforeSend` hook
(`src/lib/analytics/redact.ts`) strips all of it before anything leaves the
page, keeping only the route plus a short allowlist (`utm_*`, `ref`, `gclid`,
`fbclid`, and `from=nl`). Per-user paths collapse to their route, so
`/project-pack/9f3c…` reports as `/project-pack/[id]`.

So `/plan?q=I want a 20 by 16 concrete patio` reports as `/plan`, and
`/concrete-calculator?length=20&width=16&from=nl` as
`/concrete-calculator?from=nl`. Redaction is covered by unit tests and by
`tests/e2e/analytics.spec.ts`, which runs the page's own hook over real URLs.

Google Analytics has no `beforeSend`, so the same protection is applied
explicitly: GA4 stamps `page_location` onto every event from
`document.location.href`, which on a planner URL *is* the dimensions somebody
typed. Both `page_view` and every custom event pass a redacted absolute URL to
override it. `tests/e2e/analytics-ga4.spec.ts` drives the real product and
asserts that no query string, fragment, saved-project id, or typed description
reaches `dataLayer`.

`Referrer-Policy` stays at `strict-origin-when-cross-origin`. It governs what
*we* leak on outbound clicks, not what Vercel can attribute inbound — so it
costs no analytics value and keeps query strings out of affiliate referrers.

### Google Analytics 4

Entirely gated on `NEXT_PUBLIC_ANALYTICS_ID`, which must match
`/^G-[A-Z0-9]{4,20}$/`. Anything else — empty, absent, a UA id, a GTM id, a
half-filled variable — loads nothing at all. The shape is validated because the
value is interpolated into an inline script and a script `src`.

The loader is deliberately two pieces. A few hundred bytes of inline stub define
`dataLayer` and `gtag` during HTML parse, so anything firing at hydration
queues; `gtag/js` then loads `lazyOnload` and flushes the queue. Without the
stub the first page view of every session was lost, because the effect that
sends it ran before the library existed — GA4 would have recorded only
client-side navigation, which is the wrong half when the question is about
organic landings. `send_page_view: false` keeps GA4 from also sending its own,
so the entry page counts exactly once.

### The funnel

`src/lib/analytics.ts` keeps a provider-agnostic `track()`. Six events form the
intent funnel, with `project_saved` as a parallel return-intent signal:

```
planner_started → planner_completed → result_viewed →
shopping_cta_viewed → shopping_cta_clicked → shopping_list_viewed →
retailer_click

project_saved                                    (return intent)
project_pack_opened → project_pack_downloaded     (the deeper branch)
```

| Event | Fires when | Parameters beyond `page_location` |
| --- | --- | --- |
| `planner_started` | A planner mounts, once per planner | `projectType`, `source`, `prefilled` |
| `planner_completed` | "Calculate my project" succeeds | `projectType`, `source`, `mode`, `system` |
| `result_viewed` | A result is presented | `projectType` |
| `shopping_cta_viewed` | Half the "here's what you need" card enters the viewport | `projectType`, `source`, `placement`, `itemsReady` |
| `shopping_cta_clicked` | The shop button is pressed, on the card or the sticky bar | `projectType`, `source`, `placement`, `itemsReady` |
| `shopping_list_viewed` | 25% of the list enters the viewport | `projectType`, `source`, `placement`, `itemsReady` |
| `retailer_click` | An outbound retailer link is clicked | `retailer`, `projectType`, `materialId`, `source`, `placement` |
| `project_pack_opened` | The pack page renders a pack | `projectType`, `source` |
| `project_pack_downloaded` | The PDF blob is handed to the browser | `projectType`, `source` |
| `project_saved` | A project is saved to local storage | `projectType`, `source` |

`shopping_cta_viewed` and `shopping_cta_clicked` sit either side of the moment
users told us never happened. Without the first, a low `retailer_click` count
cannot distinguish "nobody wants this" from "nobody found it" — the exact
ambiguity that produced the post-calculation redesign. `placement` separates
`result_summary` from `sticky_bar`, so the mobile bar has to justify its space.

`itemsReady` is how many materials on the project can actually be bought online.
Three planners — mulch, gravel and sod — produce only bulk goods delivered by
the load, so they report `0` and segment cleanly rather than dragging the
conversion rate down for a reason that is not a product failure.

`retailer_click` **requires** `retailer`, enforced by an overload on `track()`.
A surface that cannot name an approved retailer cannot claim the funnel's
terminal event, so the number stays a prediction of affiliate revenue rather
than a count of outbound clicks in general.

`source` answers "did the organic answer pages turn into planner usage?" and is
a closed seven-token enum — `home`, `planner`, `answer`, `projects`, `plan`,
`direct`, `other` — never a pathname. For `planner_started` it reports where the
visitor came *from*, tracked across client-side navigation because
`document.referrer` is frozen by the History API and cannot see that hop. An
external referrer is never recorded as itself; it collapses to `other`.

`materialId` is the calculation's own id (`ready-mix`, `base-gravel`), authored
as a string literal and proved invariant under user input by evaluating every
planner at two different sizes.

Metadata is closed-vocabulary twice over: by type at the call site, and by an
**allowlist of keys and values** in `sanitize()` at runtime. Types are erased at
compilation, so the runtime allowlist is the protection that actually survives —
a field nobody declared is dropped rather than truncated, and `projectType` and
`materialId` must match a slug shape. There is no field for a dimension, a
price, a note, or anything typed.

**Vercel custom events are currently off.** They require Web Analytics Plus, a
paid tier; sending them without it is a silent no-op, so rather than fake
collection the path is gated behind `NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS`. Set it
to `true` once the tier is enabled and the existing calls forward to Vercel's
`track()` — no refactor.

Speed Insights is not installed; it can be added later.

## Testing

**Unit** — `npm test`. Covers unit conversion round-trips, validation and edge
cases, the natural-language parser, and every calculation including the
reference case: a 20 × 16 ft slab at 4 in is 3.95 yd³ before waste, 4.35 yd³
after 10%, ordered as 4.50 yd³.

**End-to-end** — `npm run e2e`. Nine journeys (homepage → estimate,
natural-language routing, shopping list, save and reopen, Project Pack and PDF
download, mobile navigation, invalid input, unit switching, all ten planners)
plus axe-core WCAG 2.1 AA audits, on Chromium and WebKit at desktop and phone
sizes.

Tests are the specification. If a calculation changes, the test changes with a
stated reason — never the other way round.

---

## What Cubitora will not claim

Quantities are planning estimates. Cubitora does not claim guaranteed
quantities, guaranteed prices, structural adequacy, or code compliance, and it
will not try to design a deck frame. Where an answer depends on a convention
rather than a measurement, that assumption is shown on the page and can be
changed.

The deck planner in particular is material planning only: spans, beam sizing,
footing depth, post spacing, and ledger attachment need a designer, a span
table, and your building department.

---

## Deployment

Deployed on Vercel from `main`; every push to `main` ships. No environment
variables are required — the site origin falls back to Vercel's own production
domain, so canonical URLs, Open Graph tags, and the sitemap are correct out of
the box. Set `NEXT_PUBLIC_SITE_URL` once you attach a real domain.

Before charging or promoting it:

- Stripe keys. Leave `NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK` unset in production;
  it defaults to off and the server ignores it there anyway.
- A lawyer's review of `/privacy` and `/terms` — both are marked inline where
  review is needed.
- A real affiliate disclosure if you turn affiliate links on.

Security headers (`X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Permissions-Policy`) are set in `next.config.ts`; Vercel
adds HSTS.
