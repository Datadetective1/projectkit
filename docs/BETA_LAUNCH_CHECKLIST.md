# Beta Launch Checklist

Actionable items only. Anything already done is listed so it does not get
re-done, not as a progress bar.

Companion documents: `CALCULATION_AUDIT.md` (every formula and where its
constants came from) and `PRELAUNCH_AUDIT.md` (findings, fixes, scorecard).

---

## Already complete

- **All ten calculations audited** against manufacturer, supplier, and trade
  sources. Four material-accuracy defects found and fixed, one safety-critical.
- **Deck no longer fabricates structural quantities.** Beams, posts, and
  footings appear on the shopping list labelled with where their sizes come
  from, and a test fails if they ever return as quantities.
- **Metric is complete**, not partial: quantities, unit prices, material notes,
  explanations, formulas, assumptions, scenarios, warnings, and field help. Paint
  is in litres. Rates convert as rates. A test gates the whole class.
- **Layout shift is 0.0000** at 1280×720, 1366×768, 1440×900, 1512×860,
  1920×1080, 1280×1600, 390×844, 430×932, and 375×667 — except 0.0055 on
  `/my-projects` at 390px, eighteen times under budget.
- **Accessibility passes WCAG 2.1 AA** across eighteen checks including error,
  empty, metric, and 404 states, plus keyboard reachability and focus visibility.
- **Analytics leaks closed.** Both pipelines redact; the allowlist is asserted in
  both directions.
- **Monetization fails closed.** The dev unlock requires an explicit opt-in and
  is refused on production regardless; free-during-beta is a separate, explicit
  flag.
- **Stripe is test-mode only.** Live keys refused unless `STRIPE_ALLOW_LIVE_MODE`
  is explicitly `true`. Webhook verifies signatures.
- **SEO is clean** across all seventeen indexable routes.
- **377 unit tests, 143 E2E** across Chromium and WebKit. Production build green.

---

## Before inviting test users

1. **Set a real contact address.** `NEXT_PUBLIC_CONTACT_EMAIL` is still
   `hello@projectkit.example`, which is a reserved placeholder domain that
   cannot receive mail. Every "Does this estimate look wrong?" link and both
   legal pages point at it. **This is the one item that makes beta feedback
   impossible if skipped**, so do it first. Optionally set
   `NEXT_PUBLIC_FEEDBACK_EMAIL` or `NEXT_PUBLIC_FEEDBACK_URL` to route reports
   somewhere separate from general contact.

2. **Decide the Project Pack's beta state and set it explicitly.**
   - Free during beta → `NEXT_PUBLIC_PROJECT_PACK_FREE=true`.
   - Charging → configure `STRIPE_SECRET_KEY` (test mode) and leave the flag
     unset.
   - With neither, the pack is *unavailable* and the panel says so. That is a
     safe default but a poor beta experience.

3. **Leave `NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK` unset in production.** It
   defaults off and the server refuses it there anyway; this is belt and braces.

4. **Attach a domain and set `NEXT_PUBLIC_SITE_URL`.** Canonicals, Open Graph,
   the sitemap, and Stripe redirects all derive from it. It currently falls back
   to the Vercel production domain, which works but bakes a `.vercel.app` URL
   into anything shared.

5. **Confirm the beta label reads the way you want.** It is on by default; the
   chip beside the logo and the `/about` section come from
   `NEXT_PUBLIC_BETA`.

6. **Run through one project end to end on the deployed site**, in both unit
   systems, including saving and generating a Project Pack. The automated sweep
   covers this, but a human should see it once on real infrastructure.

---

## During beta

- **Read the estimate reports.** They arrive with the planner, unit system, build
  id, and route. A wrong number is the highest-value bug this product can
  receive, and the audit found four of them, so expect more.
- **Record any corrected assumption in `CALCULATION_AUDIT.md`** with its source,
  the way the existing entries are. The document is the reason the numbers are
  trustworthy; letting it drift undoes that.
- **Watch which planners get used.** Each reports as its own analytics route, so
  the split is visible. It should inform what gets deepened rather than what gets
  added.
- **Re-run the audit scripts after any calculation change.** They are cheap:
  ```
  npx tsx scripts/audit-calculations.mts
  npx tsx scripts/audit-metric-prose.mts
  npx tsx scripts/audit-pack.mts
  ```
- **Do not add project categories yet.** Ten planners that are right beats
  fifteen that are unverified, and every new one needs the same source-checking
  the first ten just got.

---

## Before monetization

1. **Decide on entitlement enforcement.** Payment is verified server-side
   against Stripe, but the resulting unlock lives in `localStorage` and can be
   edited. See `PRELAUNCH_AUDIT.md` → "Project Pack entitlement" for the four
   options and the recommendation. This is a product decision, not a bug.

2. **Legal review of `/privacy` and `/terms`** by a lawyer for the jurisdictions
   you sell into. Both pages carry an inline notice saying so. Refund
   obligations and consumer-rights carve-outs are the parts that vary most.

3. **Test the full Stripe flow in test mode**: checkout, success redirect,
   session verification, cancelled checkout, and an unlock surviving a page
   reload. Then check what happens when the browser data is cleared, because
   that is the failure a customer will email about.

4. **Switch `NEXT_PUBLIC_PROJECT_PACK_FREE` off and update `/terms` copy.** The
   terms already switch automatically, but read the paid version once it is live.

5. **Only then enable live mode**, with `STRIPE_ALLOW_LIVE_MODE=true` and a live
   key. Nothing in the codebase does this for you, deliberately.

---

## Before paid acquisition

1. **Give the calculations a second month of real reports.** Paying to send
   traffic at estimates that are still being corrected converts badly and burns
   the domain's reputation.
2. **Set up a real affiliate relationship** or leave affiliate links pointing at
   a plain web search. `NEXT_PUBLIC_AFFILIATE_PARTNER_LABEL` must carry a real
   disclosure before a real affiliate URL goes in.
3. **Decide on Speed Insights.** Deliberately not enabled — the documentation
   does not establish a free tier for this plan. Revisit with a billing answer
   rather than a guess.
4. **Consider server-rendering the planner shell.** Not needed for correctness or
   for Core Web Vitals, both of which are already fine. It would improve
   first-paint content and what crawlers see without JavaScript. See
   `PRELAUNCH_AUDIT.md` → "Server rendering".
5. **Add a canonical domain redirect** so the `.vercel.app` and custom domains do
   not both get indexed.
