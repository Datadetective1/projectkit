import { projects } from "@/data/projects";
import { isProductionSite, site } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";

/**
 * /llms.txt — a machine-readable map of what Cubitora is and where its public
 * content lives.
 *
 * **What this is not:** a ranking signal. Google has confirmed no Search system
 * reads it, and no major provider has committed to consuming it in production.
 * Anyone told otherwise is being sold something. It is added because it is
 * cheap, harmless, and occasionally useful to a tool that does look for it —
 * not because it is expected to move anything.
 *
 * Generated from the project definitions rather than written out, so it cannot
 * drift from the planners that actually exist. That drift is the only real
 * cost this file has: a hand-maintained list starts lying the first time a
 * planner is added or renamed.
 *
 * Same exclusions as robots.txt and IndexNow: nothing user-specific.
 */
export const dynamic = "force-static";

export function GET() {
  // A preview deployment should not advertise itself as the canonical source.
  if (!isProductionSite) {
    return new Response("", { status: 404 });
  }

  const planners = projects
    .map((project) => `- [${project.name}](${absoluteUrl(`/${project.slug}`)}): ${project.tagline}`)
    .join("\n");

  const body = `# ${site.name}

> ${site.tagline} ${site.supportingLine}

${site.name} is a home-improvement project planner at ${site.url}. You describe a
project — or pick a planner — enter the measurements, and it works out how much
material to buy, what it costs, and what order to do the work in.

## What it produces

- Material quantities, with a waste allowance applied
- Purchase quantities rounded to what is actually sold: whole bags, whole boxes,
  bulk goods in supplier increments
- An estimated material cost, using editable planning prices
- A shopping list, including the items people forget
- Scenario comparisons, such as ready-mix against bagged concrete
- A printable Project Pack: summary, materials, budget, shopping list, and the
  order of operations

Both US customary and metric units throughout.

## How the numbers are produced

Calculations are **deterministic arithmetic**, not model output. Every formula
is unit-tested and shown on the page it belongs to, under "How it is
calculated".

Where an answer depends on a convention rather than a measurement — a waste
percentage, a coverage rate, a bag yield — that is a **planning assumption**. It
is labelled as one, shown with its value, and editable. Assumptions are
documented with the sources they were checked against.

AI is used in exactly one place: reading a plain-English project description to
choose a planner and extract the numbers already in it. It never performs a
calculation.

## What it does not do

- Structural engineering: spans, beam and joist sizing, footing depth, ledger
  attachment
- Code compliance or permit guidance
- Live retail pricing — prices are editable planning figures, not quotes
- Sales tax, delivery, or equipment rental, which are excluded from all totals

## Project planners

${planners}

## Pages

- [All planners](${absoluteUrl("/projects")}): every planner, grouped by category
- [About](${absoluteUrl("/about")}): what ${site.name} does and does not do
- [Privacy](${absoluteUrl("/privacy")}): no accounts; projects are stored in the browser
- [Terms](${absoluteUrl("/terms")}): planning estimates only

## Notes

- Canonical host: ${site.url}
- No account is required and nothing is stored server-side
- Saved projects, Project Packs, and the natural-language route
  (\`/plan\`, \`/my-projects\`, \`/project-pack/*\`) are user-specific and are
  excluded from crawling
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
