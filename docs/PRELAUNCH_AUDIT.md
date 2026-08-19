# Pre-Launch Audit

Branch: `prelaunch-hardening`. Conducted 2026-08-18/19 against the production
build, not the dev server, in two passes: a pre-launch hardening audit and a
beta-readiness finalization pass.

No new project categories were added. No paid service was enabled, no plan
upgraded, and nothing was purchased. Stripe remains test-mode only.

Companions: `CALCULATION_AUDIT.md` for every formula and where its constants
came from, `BETA_LAUNCH_CHECKLIST.md` for what to do next.

---

## Verdict: **BETA READY AND SAFE TO INVITE TESTERS**

Provided one configuration item is set first: the contact address is still the
reserved placeholder `hello@projectkit.example`, which cannot receive mail, and
every feedback path points at it. That is a five-minute environment variable,
not a code change, and it is item one of the checklist.

**What justifies it.** The calculations are verified against external sources
rather than against themselves. Four material-accuracy defects were found and
fixed, one safety-critical. Metric is now complete rather than partial — the
first pass fixed the numbers, the second fixed the sentences around them and the
form fields that feed them. Layout shift is 0.0000 across nine viewports.
Accessibility passes WCAG 2.1 AA across eighteen checks. Monetization fails
closed. Both analytics pipelines redact. 377 unit tests and 143 E2E tests pass,
and the ones added here verifiably fail against the code they were written for.

Testers can also now tell us when a number looks wrong, which they could not
before, and every report identifies the build it came from.

**What still holds it back from PUBLIC LAUNCH READY.** Both are about charging
money, neither is a correctness problem in the calculators:

1. **The Project Pack unlock is client-side.** Payment is verified server-side
   against Stripe, but the resulting entitlement lives in `localStorage`, so a
   determined user can unlock the pack by editing it. Analysed in full below —
   it needs a decision, not a fix, and it does not matter at all while the pack
   is free during beta.
2. **Legal pages have not had a lawyer's eye.** `/privacy` and `/terms` are
   factually accurate about what the system does — that was checked and two
   inaccuracies were corrected — but accuracy is not legal sufficiency. Both
   carry inline notices saying so.

---

## Scorecard

| Area | Grade | Notes |
| --- | --- | --- |
| **Calculation accuracy** | A | Four defects found and fixed; constants traced to manufacturers and suppliers. See `CALCULATION_AUDIT.md` |
| **Calculation safety** | A | Deck no longer fabricates structural quantities; cross-cutting test blocks code-compliance language |
| **Unit handling (numbers)** | A | Metric parity exact to 0.0000%; round-trip lossless; purchase increments market-correct |
| **Unit handling (prose)** | A | Was C. All ~60 strings converted; explanations, formulas, assumptions, scenarios, warnings, and field help all read in the reader's system. Gated by a shared rule |
| **Unit handling (rates)** | A | New in the second pass. Prices per unit and paint coverage now convert as rates, both halves together |
| **Purchase rounding** | A | Always up, never fractional, never below requirement — enforced across all ten planners |
| **Shopping list quality** | A | Fastener counts converted to purchasable boxes; unit grammar fixed |
| **Cost transparency** | A | Tax, delivery, and rental now named as excluded; prices editable and labelled as planning figures |
| **Natural-language router** | A | 59/60 on a varied sweep; every ambiguous, off-topic, and injection-shaped prompt correctly declines |
| **Core Web Vitals** | A | CLS 0.0000 at nine viewports (1280×720 through 1920×1080, plus 1280×1600, 375, 390, 430). One 0.0055 residual, 18× under budget |
| **Accessibility** | A | Eighteen axe checks at WCAG 2.1 AA, plus keyboard reachability and focus visibility. Nothing needed fixing |
| **SEO — technical** | A | All 17 routes: one h1, canonical, OG, Twitter card, BreadcrumbList + WebApplication + FAQPage on planners |
| **SEO — metadata** | A | Six over-length titles fixed; limits now enforced by test with the suffix counted |
| **Analytics privacy** | A | A real leak found and closed in the Google path; both pipelines now redacted and tested |
| **Monetization safety** | A | Dev unlock fails closed and is refused in production; free-during-beta is a separate explicit flag; malformed price can no longer reach Stripe |
| **Stripe safety** | A | Test-mode only; live keys refused unless explicitly enabled; webhook signature verified |
| **Secret hygiene** | A | No secrets in the repo; `.env*` ignored with only `.env.example` committed |
| **Entitlement enforcement** | C | Payment verified server-side, entitlement stored client-side. Analysed below; irrelevant while the pack is free |
| **Legal accuracy** | A | New in the second pass. Two factual inaccuracies corrected; pages now describe the system that exists |
| **Legal review** | Incomplete | Marked inline; needs a lawyer before paid acquisition |
| **Beta feedback** | A | New in the second pass. Report link under every result, carrying build id and route but no user input |

---

## Defects found and fixed

Ordered by what they would have cost a real user.

### Safety

**Deck fabricated structural quantities.** Beam footage, post count, and footing
count were derived from the deck outline by expressions like `length × 2`. A
homeowner could reasonably have built to them. Removed; they now appear on the
shopping list labelled with where their sizes actually come from. Full write-up
in `CALCULATION_AUDIT.md`.

**Two hazards were implied but never stated.** Wet concrete is caustic and burns
skin it sits against — kneeling in it in wet jeans is the classic injury.
Sanding joint compound throws fine respirable dust. Both shopping lists already
listed the protective gear; neither said why.

### Wrong quantities

**Flooring trim under-ordered 37% on a long room** (perimeter as `4 × √area`).
**Drywall tape over-ordered 3.5×.** **Tile thinset under-ordered ~50% for
large-format tile.** All three in `CALCULATION_AUDIT.md`.

**Metric mode printed imperial units beside converted numbers.** Form boards
read "24 linear ft" in metric — the value had been converted to metres and only
the label was hardcoded, so a reader would have bought a third of the timber
they needed. Same pattern in deck and flooring.

### Wrong-looking numbers

**Unit prices did not multiply out in metric.** `unitPrice` is per canonical
unit, so metric showed "3.40 m³ · $165.00 per yd³ · $734" and invited the reader
to compute 3.40 × 165 = 561 and conclude the total was broken.

**Material notes contradicted the quantity above them** — "Covers 608 sq ft"
beneath a 51 m² headline.

**Fastener counts were not shopping lists.** 5,538 screws (fence), 672 fasteners
(deck). Screws are sold by weight.

**Saved-project titles showed raw conversion output** — "Concrete — 6.096 ×
4.8768 m".

### Privacy

**The Google Analytics path leaked planner query strings.** The Vercel pipeline
was carefully redacted through `beforeSend`; the GA path had no equivalent and
no test coverage. Two leaks: `trackPageView` sent the raw pathname, so a
saved-project id went to Google as `/project-pack/<uuid>`; and GA4 stamps
`page_location` onto every event by reading `document.location.href` itself,
which on a planner URL is the user's dimensions and prices. The closed
`AnalyticsProps` vocabulary could not prevent the second — the field is added
downstream of it. Both now pass an explicit redacted `page_location`.

### Revenue

**The dev unlock defaulted to on.** `NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK`
was `!== "false"`, so any deployment that had not explicitly disabled it gave
the only paid product away. The failure mode was silent: the site looks
completely healthy while earning nothing. Now requires an explicit `"true"`, and
`devUnlockAllowed()` refuses it on production deployments regardless of what the
build-time flag said.

### Performance

**Layout shift on tall viewports.** The planner skeleton reserved a flat 44rem,
which is only "below the fold" on the viewport it was tuned for. At 1600px tall
the FAQ and related-projects sections were visible at first paint and were
shoved down on hydration — 0.18 to 0.22 CLS on every planner route, past the 0.1
threshold. Now `max(44rem, 100svh)`, so the reservation follows the window.
`/my-projects` had the same shape at smaller scale (0.044).

Both measured 0.0000 at 900px, which is why a single-viewport check had missed
them. The E2E guard now runs at 1600px and verifiably fails against the old
code.

### Presentation

**Counted units read "1 bags" and "1 rolls"** wherever a call site hardcoded the
plural. Fixed once in `formatQuantity` rather than at a dozen call sites.

**The deck pack printed the same warning twice**, where a project disclaimer
duplicated a calculation warning.

**Costs never said what they exclude.** A bulk order's delivery fee is real
money. Tax, delivery, and rental are now named on the results panel and in the
pack disclaimer.

**Six page titles ran past the ~60 characters a search result shows.** Each read
fine alone and only crossed the line once the layout appended " | ProjectKit".

**The router did not know supplier vocabulary.** "road base" and "crusher run"
routed to concrete; "resod" did not match `\bsod\b`.

---

## What was verified and found already correct

Worth recording, because "we looked and it was fine" is a result:

- **Accessibility.** Eighteen checks including error states, the empty
  saved-projects card, metric mode, and the 404 page — all of which were
  previously unaudited. Nothing needed fixing. Keyboard reachability and focus
  visibility, which axe does not test, also pass.
- **The router's refusals.** Every ambiguous request ("remodel the kitchen"),
  off-topic request, and injection-shaped prompt already declined to route
  rather than guessing. These are now tests, because a router that quietly
  starts guessing fails silently.
- **Stripe safety.** Live keys refused unless `STRIPE_ALLOW_LIVE_MODE=true`.
  Webhook verifies signatures against the raw body. Checkout errors never leak
  Stripe's internal text. The verify endpoint asks Stripe rather than trusting
  the client.
- **Secret hygiene.** Nothing sensitive in the repo; `.env*` ignored with only
  the template committed.
- **Project Pack rendering.** All thirty renders (ten projects × desktop /
  mobile / metric) with a deliberately long note: no horizontal overflow, no
  `NaN`, no `undefined`, no `[object Object]`.
- **Structured data.** BreadcrumbList, WebApplication, and FAQPage on every
  planner; Organization sitewide.
- **Metric parity.** 0.0000% relative difference on the headline requirement
  across all ten planners.

---

## Deliberate non-actions

**Speed Insights was not enabled.** The instruction was to enable it only if
provably free, and to leave it off given any uncertainty about charges. Vercel's
documentation describes usage limits and a "managing usage" flow for Speed
Insights but does not establish a free tier for this account's plan. That is
uncertainty, so it stays off. `@vercel/speed-insights` is not installed and no
code references it.

**Vercel custom events remain disabled.** They require Web Analytics Plus, a
paid tier. `isVercelCustomEventsEnabled()` gates the path so nothing is sent
into a pipeline that would silently drop it — the alternative would be faking
collection.

**Explanation prose was not half-converted — in the first pass.** It is now
fully converted; see the second-pass section below.

**Nothing was merged to `main`.** The branch is left ready for review.

---

## Second pass: beta-readiness finalization

### Metric narrative, finished

The first pass left quantities, prices, and notes correct while the sentences
around them still mixed systems: "a 111 m² bed at 3 in deep needs 8.50 m³". The
reason there were sixty of those is that every calculator interpolated
`roundTo(value, n)` next to a unit word typed by hand.

`src/lib/calc/describe.ts` is now the only place a unit name may be written.
`describeFor(system)` binds a set of formatters to one system so a call site
cannot forget it. Two of them exist because the naive conversion is wrong:

- **Coverage inverts.** 350 sq ft per US gallon is 8.59 m² per litre, not the
  32.5 you get by converting the area and leaving the gallon alone. Four times
  too generous, on the field that decides how much paint to buy.
- **Prices are per canonical unit.** `$165 per yd³` is `$215.81 per m³`. Left
  raw, the metric user was asked for a per-m³ price against a per-yd³ number.

Paint also needed a new measure entirely. It rode on `count` with a hardcoded
"gallons", so a metric reader was told to buy gallons — unusable outside the US.
`volumeLiquid` now flows through the headline, summary, materials, scenarios,
and unit price.

Formulas are system-aware where the arithmetic differs. The ÷ 12, ÷ 27, and
÷ 144 in concrete, mulch, gravel, tile, and deck exist only to reconcile inches,
feet, and yards; showing them to a metric reader is noise that does not match
their numbers.

Field help text was the last holdout and the most direct contradiction the form
could produce: "4 in is typical for patios" sat under a field showing
centimetres. `help` now takes a function of the unit system. US keeps
sixteenths for grout joints and metric gets millimetres, because "0.19 in" is
how neither trade talks.

Also found and fixed on the way: two fence scenarios both rounded to "2 m post
spacing" and offered the reader the same option twice; mulch compared bulk and
bagged cost with no currency symbol; unit names used US spelling against the
site's British copy; two tool sizes (a sash brush, taping knives) stayed in
inches when they are sold in millimetres everywhere else.

### Rates, as a concept

`perMeasure` on a number input says "this field is a quantity *per* another
quantity". Eighteen inputs across nine planners declare it. Both halves convert
together and the denominator moves the value the other way. Per-package prices
("$ / bag", "$ / sheet") deliberately do not, because a bag means the same thing
in both systems.

Verified: every rate round-trips exactly, headline quantities stay identical
between systems to 0.0000%, and costs stay within the known
bulk-purchase-increment variance.

### Beta infrastructure

**Free-during-beta is a separate flag from the dev unlock.**
`NEXT_PUBLIC_PROJECT_PACK_FREE` states the pack is free as a product decision
and is honoured in production; the dev unlock stays a local convenience the
server refuses there. Keeping them apart means "free during beta" never has to
be expressed by leaving a development flag switched on — which is precisely how
the paid product got given away by accident in the first place.

**A build identifier** in the footer, from Vercel's commit SHA, so "the fence
numbers look wrong" can be tied to a deployment.

**Report a problem** under every result, because that is where someone realises
a number looks wrong. It carries the planner, unit system, build id, and route
— the same closed set analytics is allowed — and never the dimensions, notes, or
free text. No database: a link that reaches a human beats a ticketing system
nobody reads.

**A malformed price could reach Stripe.** `Number("abc")` is `NaN` and
`Number("")` is 0; both used to travel into the checkout line item.

### Project Pack entitlement — the analysis

Payment is verified server-side against Stripe. The resulting unlock is a record
in `localStorage`, which a determined user can write by hand.

| Option | Complexity | Friction | Restores after clearing data | Verdict |
| --- | --- | --- | --- | --- |
| **A. Keep local unlock** | none | none | no | Right for beta |
| **B. Server-signed entitlement token** | low — one HMAC secret, one signed string in `localStorage` | none | no | **Recommended for launch** |
| **C. Short-lived signed download URL** | medium — the PDF must move server-side | small | no | Only if the PDF becomes the product |
| **D. Re-verify the Stripe session on every download** | low, but a Stripe call per download | none | yes, if they keep the link | Good complement to B |

**Recommendation: B plus D, and not before charging starts.**

B closes the edit-your-own-unlock hole for the cost of one secret and a
signature check — the browser holds a token it cannot forge rather than a
boolean it can flip. D gives the honest answer to "I cleared my browser and lost
my pack", which is the support email this design otherwise guarantees: the
success URL already carries the Stripe session id, so re-verifying it restores
access without an account.

Neither is worth building now. The pack is free during beta, so there is nothing
to protect, and the content is visible on screen before purchase, which bounds
the loss even when charging. **This should not become an authentication
project** — accounts would cost more than the leakage they prevent.

### Server rendering — the investigation

The planner is a client component because it reads `useSearchParams()` for URL
prefill and `localStorage` for saved projects. Under Suspense that makes Next
bail out of prerendering the subtree, which is why a skeleton exists at all.

Moving `searchParams` to the server would make all ten planner pages dynamic,
losing static generation — a real cost for pages whose whole value is being
cheap to serve and easy to crawl.

**Not done, and not needed.** CLS is already 0.0000 across nine viewports, LCP
is 100–200ms locally and 300–650ms on the preview deployment, and every planner
page ships complete SEO content — heading, intro, FAQ, related projects, and
structured data — in static HTML regardless of the planner. The remaining
benefit is first-paint *form* content, which is a refinement rather than a fix.

The honest version for a future pass: render the planner shell statically with
default values and apply URL prefill during hydration. That trades a brief flash
of defaults on `/plan` redirects for static form markup, and the flash is the
thing the current design was built to avoid.

---

## Open items, in priority order

1. **Set a real contact address.** `hello@projectkit.example` is a reserved
   placeholder domain that cannot receive mail, and every feedback path points
   at it. Configuration, not code, but it blocks beta feedback entirely.
2. **Decide on entitlement enforcement** before charging. Analysis and
   recommendation above.
3. **Legal review of `/privacy` and `/terms`.** Both are now factually accurate
   about the system; that is not the same as legally sufficient.
4. **Metric default dimensions carry conversion precision.** The concrete
   planner opens at 6.096 × 4.8768 m because the defaults are declared in feet
   and converted exactly. Rounding them would read better but would break the
   exact metric parity the audit relies on, since 4.88 m is not 16 ft. The right
   fix is per-system defaults (`metricDefault` on the input) plus a parity test
   that converts rather than compares defaults — a contained change, but one
   that changes what that test proves, so it wants its own pass.
5. **Gravel's custom-density field** is `lb / cu ft` in both systems. It is an
   advanced override defaulting to 0 (meaning "use the selected material"), and
   a compound mass-per-volume unit has no measure in the engine. Low impact,
   documented rather than fixed.
6. **Reconsider `sqFtPerBox` defaults per material.** Flooring defaults to
   24 sq ft/box and tile to 15; both plausible, both vary widely by product.
   Editable and labelled, so polish rather than correctness.

---

## Reproducing this audit

Every probe is committed and re-runnable. With a production build served on
`:3210`:

```
npx tsx scripts/audit-calculations.mts     # quantities, costs, metric parity
npx tsx scripts/audit-drywall-tape.mts     # seam-length derivation
npx tsx scripts/audit-formulas.mts         # every formula and assumption
npx tsx scripts/audit-router.mts           # 60-prompt routing sweep
npx tsx scripts/audit-metric-prose.mts     # imperial units in metric output
npx tsx scripts/audit-vitals.mts           # CLS/LCP across nine viewports
npx tsx scripts/audit-seo.mts              # metadata and structured data
npx tsx scripts/audit-pack.mts             # 30 pack renders + screenshots
```

Gate: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`,
`npx playwright test`, `npm run build`. All green as of this document —
377 unit tests, 143 E2E across Chromium and WebKit.
