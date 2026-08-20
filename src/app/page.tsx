import Link from "next/link";
import { ArrowRight, ClipboardList, Receipt, Ruler, Search, Wrench } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { HeroPreview } from "@/components/home/HeroPreview";
import { PackPreview } from "@/components/home/PackPreview";
import { JsonLd } from "@/components/ui/JsonLd";
import { projects } from "@/data/projects";
import { pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { site } from "@/config/site";

export const metadata = pageMetadata({
  // Not the tagline: it runs to 80 characters with the site name, and a
  // search result truncates near 60. The tagline still leads the page itself.
  title: `${site.name} — Home Improvement Material Calculators`,
  description: site.description,
  path: "/",
});

const EXAMPLE_PROMPTS = [
  "I want to build a 20 by 16 concrete patio",
  "I need a 6 foot privacy fence around my backyard",
  "I want to repaint three bedrooms",
  "I need mulch for a 1,200 sq ft flower bed",
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={webApplicationJsonLd({
          name: site.name,
          description: site.description,
          path: "/",
        })}
      />

      {/* ------------------------------------------------------------ hero */}
      {/*
        Two columns, deliberately asymmetric: the ask on the left, the payoff on
        the right. The old hero was a centred headline over an empty search box,
        which described the product without ever showing it — a first-time
        visitor had to imagine what came out. Now they can read it.

        Order matters on mobile. The input comes first in the DOM and stays
        first visually, because on a phone the only thing that matters is being
        able to type; the preview follows as supporting evidence.
      */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14 lg:py-20">
          <div>
            <h1 className="text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
              Plan the project.
              <span className="block text-brand">Know what you need.</span>
            </h1>
            <p className="pk-prose mt-4 max-w-lg text-base sm:text-lg">
              {site.supportingLine}
            </p>

            <form
              id="plan"
              action="/plan"
              method="get"
              className="mt-8 max-w-xl"
            >
              <label
                htmlFor="project-description"
                className="block text-sm font-medium text-ink"
              >
                {site.prompt}
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle"
                  />
                  <input
                    id="project-description"
                    name="q"
                    type="text"
                    required
                    maxLength={300}
                    autoComplete="off"
                    placeholder="A 20 × 16 concrete patio"
                    className="pk-field h-[3.25rem] pl-11 text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="pk-btn pk-btn-primary h-[3.25rem] shrink-0 px-6 text-base"
                >
                  Plan my project
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Try</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <li key={prompt}>
                    <Link
                      href={`/plan?q=${encodeURIComponent(prompt)}`}
                      className="inline-block rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand-ink"
                    >
                      {prompt}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-6 text-sm text-ink-subtle">
              No account. No sign-up. Free while we are in beta.
            </p>
          </div>

          {/* Supporting evidence, not decoration. Hidden from assistive tech
              would be wrong — the numbers are the argument — so it stays in the
              accessibility tree with a caption explaining what it is. */}
          <div className="lg:pl-4">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- projects */}
      <section aria-labelledby="popular-projects" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="popular-projects" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Or pick a project
            </h2>
            <p className="pk-prose mt-2 text-sm">
              Ten planners, all built on the same engine. Every one gives you quantities, cost, and
              a shopping list.
            </p>
          </div>
          <Link href="/projects" className="pk-btn pk-btn-secondary">
            See all projects
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section aria-labelledby="how-it-works" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="how-it-works" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Describe your project",
                body: "Type what you are building, or pick a planner and enter the dimensions.",
              },
              {
                icon: Ruler,
                title: "Get real quantities",
                body: "Deterministic calculations with waste, packaging sizes, and rounding to what you can actually buy.",
              },
              {
                icon: ClipboardList,
                title: "Leave with a plan",
                body: "A budget, a shopping list, a project sequence, and a pack you can print or share.",
              },
            ].map((step, index) => (
              <li key={step.title} className="pk-card p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <step.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">
                  <span className="text-ink-subtle">{index + 1}.</span> {step.title}
                </h3>
                <p className="pk-prose mt-1.5 text-sm">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------- example result */}
      <section aria-labelledby="example-result" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 id="example-result" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Leave with a plan, not a number
            </h2>
            <p className="pk-prose mt-3 max-w-prose">
              A calculator tells you the volume. Cubitora tells you what to order, what it costs,
              what else you need, and what order to do it in — then hands you a document you can
              take to the store.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { icon: Ruler, text: "Quantities with waste and real purchase rounding" },
                { icon: Receipt, text: "An editable budget using your own prices" },
                { icon: ClipboardList, text: "A tickable shopping list, including the bits people forget" },
                { icon: Wrench, text: "Scenario comparisons — ready-mix versus bags, bulk versus bagged" },
              ].map((item) => (
                <li key={item.text} className="flex gap-3">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span className="text-sm text-ink">{item.text}</span>
                </li>
              ))}
            </ul>
            <Link href="/concrete-calculator" className="pk-btn pk-btn-primary mt-7">
              Create my Project Pack
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <PackPreview />
        </div>
      </section>

      {/* ------------------------------------------------------- categories */}
      <section aria-labelledby="categories" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="categories" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Browse by category
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {Array.from(new Set(projects.map((project) => project.category))).map((category) => (
              <div key={category}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
                  {category}
                </h3>
                <ul className="mt-3 space-y-2">
                  {projects
                    .filter((project) => project.category === category)
                    .map((project) => (
                      <li key={project.slug}>
                        <Link
                          href={`/${project.slug}`}
                          className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                        >
                          {project.name} calculator
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/** A static, honest sample of real Cubitora output for a 20 × 16 patio. */
