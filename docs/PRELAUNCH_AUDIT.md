# Pre-Launch Audit

Branch: `prelaunch-hardening`. Conducted 2026-08-18/19 against the production
build, not the dev server.

No new project categories were added. No paid service was enabled, no plan
upgraded, and nothing was purchased. Stripe remains test-mode only.

---

## Verdict: **BETA READY**

Ship it to real users, with the caveats below understood. Not yet
`PUBLIC LAUNCH READY`, for two reasons that are both about the paid product and
neither of which is a correctness problem in the calculators.

**What justifies BETA READY.** The calculations are now verified against
external sources rather than against themselves. Four material-accuracy defects
were found and fixed, one of them safety-critical. Metric parity is exact.
Layout shift is zero at every viewport tested. Accessibility passes WCAG 2.1 AA
across eighteen checks including error, empty, metric, and 404 states. 350 unit
tests and 143 E2E tests pass, and the ones added here verifiably fail against
the code they were written for.

**What holds it back from PUBLIC LAUNCH READY.**

1. **The Project Pack unlock is client-side.** Payment is verified server-side
   against Stripe, but the resulting entitlement lives in `localStorage`, so a
   determined user can unlock the pack for free by editing it. This is a
   deliberate accountless-product tradeoff, not an oversight — and the pack's
   content is already visible on screen before purchase, so the loss is bounded.
   It needs a decision, not a fix.
2. **Legal pages have not had a lawyer's eye.** `/privacy` and `/terms` are
   marked inline where review is needed. Charging money in multiple
   jurisdictions without that review is a business risk, not an engineering one.

Neither blocks a beta with real users. Both should be settled before paid
acquisition.

---

## Scorecard

| Area | Grade | Notes |
| --- | --- | --- |
| **Calculation accuracy** | A | Four defects found and fixed; constants traced to manufacturers and suppliers. See `CALCULATION_AUDIT.md` |
| **Calculation safety** | A | Deck no longer fabricates structural quantities; cross-cutting test blocks code-compliance language |
| **Unit handling (numbers)** | A | Metric parity exact to 0.0000%; round-trip lossless; purchase increments market-correct |
| **Unit handling (prose)** | C | Quantities, prices, and notes correct; narrative paragraphs still mix systems. ~60 strings, inventoried |
| **Purchase rounding** | A | Always up, never fractional, never below requirement — enforced across all ten planners |
| **Shopping list quality** | A | Fastener counts converted to purchasable boxes; unit grammar fixed |
| **Cost transparency** | A | Tax, delivery, and rental now named as excluded; prices editable and labelled as planning figures |
| **Natural-language router** | A | 59/60 on a varied sweep; every ambiguous, off-topic, and injection-shaped prompt correctly declines |
| **Core Web Vitals** | A | CLS 0.0000 at 375, 390, 1280×1600, 1440×900. Two shifts found and fixed |
| **Accessibility** | A | Eighteen axe checks at WCAG 2.1 AA, plus keyboard reachability and focus visibility. Nothing needed fixing |
| **SEO — technical** | A | All 17 routes: one h1, canonical, OG, Twitter card, BreadcrumbList + WebApplication + FAQPage on planners |
| **SEO — metadata** | A | Six over-length titles fixed; limits now enforced by test with the suffix counted |
| **Analytics privacy** | A | A real leak found and closed in the Google path; both pipelines now redacted and tested |
| **Monetization safety** | A | Dev unlock flipped to fail-closed and refused outright in production |
| **Stripe safety** | A | Test-mode only; live keys refused unless explicitly enabled; webhook signature verified |
| **Secret hygiene** | A | No secrets in the repo; `.env*` ignored with only `.env.example` committed |
| **Entitlement enforcement** | C | Payment verified server-side, entitlement stored client-side. Accepted tradeoff — see verdict |
| **Legal review** | Incomplete | Marked inline; needs a lawyer before paid acquisition |

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

**Explanation prose was not half-converted.** Roughly sixty strings across ten
calculators mix unit systems in narrative text. Fixing a third of them would be
worse than fixing none: the inconsistency would look arbitrary rather than
systematic. Inventoried by `scripts/audit-metric-prose.mts` and listed below.

**Nothing was merged to `main`.** The branch is left ready for review.

---

## Open items, in priority order

1. **Decide on entitlement enforcement.** Client-side unlock is defensible for
   an accountless product whose content is visible before purchase. It is a
   product decision, not a bug. Options: accept it, add accounts, or
   watermark/gate the PDF server-side.
2. **Legal review of `/privacy` and `/terms`.** Both marked inline.
3. **Convert explanation prose to the reader's unit system.** ~60 strings; the
   `fmt` helper is already hoisted above the materials array in seven of the ten
   calculators, so the mechanism is in place. Run
   `scripts/audit-metric-prose.mts` for the current inventory. Product
   specifications should stay imperial — a 4 × 8 ft sheet and a 60 lb bag are
   what is printed on the packaging.
4. **Currency-measure input labels** still read "$ / sq ft" in metric mode.
   `formatQuantity` returns early for the currency measure before the label is
   localised. Small and self-contained.
5. **Reconsider `sqFtPerBox` defaults per material.** Flooring defaults to
   24 sq ft/box and tile to 15; both are plausible but vary widely by product.
   They are editable and labelled, so this is polish rather than correctness.

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
npx tsx scripts/audit-vitals.mts           # CLS/LCP across four viewports
npx tsx scripts/audit-seo.mts              # metadata and structured data
npx tsx scripts/audit-pack.mts             # 30 pack renders + screenshots
```

Gate: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`,
`npx playwright test`, `npm run build`. All green as of this document.
