import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { HeroShowcase } from "@/components/home/HeroShowcase";
import { ProcessStrip } from "@/components/home/ProcessStrip";
import { CompareSection } from "@/components/home/CompareSection";
import { PackShowcase } from "@/components/home/PackShowcase";
import { Reveal } from "@/components/motion/Reveal";
import { JsonLd } from "@/components/ui/JsonLd";
import { projects } from "@/data/projects";
import { heroProjects } from "@/lib/home/heroData";
import { concreteComparison } from "@/lib/home/compareData";
import { pageMetadata, webApplicationJsonLd, webSiteJsonLd } from "@/lib/seo";
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

/**
 * The homepage.
 *
 * The rhythm is deliberate and it is the main thing this page was missing. It
 * used to be five variations on "left-aligned heading over a grid of white
 * cards", which is legible, professional, and completely forgettable. Now the
 * scroll alternates weight:
 *
 *   paper (hero, ruled) → tint (the process) → paper (the planners) →
 *   paper (the comparison) → DEEP GREEN (the Project Pack) → surface (browse)
 *
 * so there is somewhere for the eye to rest and one thing to remember. The
 * numbers throughout come from the real engine at build time, never from
 * copywriting.
 */
export default function HomePage() {
  const hero = heroProjects();
  const comparison = concreteComparison();

  return (
    <>
      <JsonLd
        data={[
          webSiteJsonLd(),
          webApplicationJsonLd({
            name: site.name,
            description: site.description,
            path: "/",
          }),
        ]}
      />

      {/* ------------------------------------------------------------ hero */}
      {/*
        Two columns, deliberately asymmetric: the ask on the left, the payoff on
        the right.

        Order matters on mobile. The input comes first in the DOM and stays
        first visually, because on a phone the only thing that matters is being
        able to type; the demonstration follows as supporting evidence.

        The ruled grid behind it is the site's motif — drafting paper — faded at
        the edges so it reads as a surface rather than a tiled background.
      */}
      <section className="relative border-b border-line bg-surface">
        <div className="pk-rule-grid pk-rule-fade absolute inset-0" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:py-20">
          <div>
            {/*
              Balance is switched off here. The two lines are already written to
              break where they should, and letting the browser rebalance them
              turned "Know what you need." into two ragged lines at desktop
              width — the one place the headline has to be crisp.
            */}
            <h1 className="text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-ink [text-wrap:pretty] sm:text-[2.875rem] lg:text-[3.25rem]">
              Plan the project.
              <span className="block text-brand">Know what you need.</span>
            </h1>
            <p className="pk-prose mt-4 max-w-lg text-base sm:text-lg">{site.supportingLine}</p>

            <form id="plan" action="/plan" method="get" className="mt-8 max-w-xl">
              <label htmlFor="project-description" className="block text-sm font-medium text-ink">
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
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-subtle">
                Try
              </p>
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

          {/* The demonstration. Real engine output, switchable, animated. */}
          <div className="lg:pl-4">
            <HeroShowcase projects={hero} />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- process */}
      <ProcessStrip />

      {/* -------------------------------------------------------- projects */}
      <section aria-labelledby="popular-projects" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-brand">
                Ten planners
              </p>
              <h2
                id="popular-projects"
                className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
              >
                Or pick a project
              </h2>
              <p className="pk-prose mt-2 max-w-lg text-sm">
                All built on the same engine. Every one gives you quantities, cost, and a shopping
                list.
              </p>
            </div>
            <Link href="/projects" className="pk-btn pk-btn-secondary">
              See all projects
            </Link>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {projects.map((project, index) => (
              <div
                key={project.slug}
                className="pk-stagger-item flex"
                style={{ "--pk-delay": `${index * 45}ms` } as React.CSSProperties}
              >
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* -------------------------------------------------------- compare */}
      <CompareSection comparison={comparison} />

      {/* ----------------------------------------------------------- pack */}
      <PackShowcase />

      {/* ------------------------------------------------------ categories */}
      <section aria-labelledby="categories" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Reveal>
            <h2
              id="categories"
              className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            >
              Browse by category
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {Array.from(new Set(projects.map((project) => project.category))).map((category) => (
                <div key={category}>
                  <h3 className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
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
          </Reveal>
        </div>
      </section>
    </>
  );
}
