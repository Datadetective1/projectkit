import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { ProjectPlanner } from "@/components/planner/ProjectPlanner";
import { ProjectCard } from "@/components/ProjectCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FaqSection } from "@/components/ui/FaqSection";
import { JsonLd } from "@/components/ui/JsonLd";
import { AdSlot } from "@/components/monetization/AdSlot";
import { PlannerMethod } from "@/components/PlannerMethod";
import { MaterialSwatch } from "@/components/brand/MaterialSwatch";
import { getProject, projectSlugs, relatedProjects } from "@/data/projects";
import { answersFor } from "@/data/answers";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { legal } from "@/config/site";

export function generateStaticParams() {
  return projectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return pageMetadata({
    title: project.seo.title,
    description: project.seo.description,
    path: `/${project.slug}`,
  });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const related = relatedProjects(project.slug);
  const answers = answersFor(project.slug);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.seo.breadcrumb, path: `/${project.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          webApplicationJsonLd({
            name: project.h1,
            description: project.seo.description,
            path: `/${project.slug}`,
          }),
          faqJsonLd(project.faq),
        ]}
      />

      {/*
        The planner's header, on drafting paper.

        The tool itself is deliberately left plain — it is where someone is
        concentrating on numbers, and texture behind a form is noise. But
        arriving from a homepage of ruled paper onto an unruled white page
        breaks the thread, so the motif carries as far as the header and stops
        at the form. A band of the project's own material sits under the
        breadcrumbs, which is also the fastest way to know which planner you
        are on.
      */}
      <div className="relative overflow-hidden border-b border-line bg-surface">
        <div className="pk-rule-grid pk-rule-fade absolute inset-0" aria-hidden />
        <MaterialSwatch
          accent={project.accent}
          id={`header-${project.slug}`}
          scale={26}
          className="absolute inset-x-0 top-0 h-1.5 w-full opacity-60"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-9 pt-7 sm:px-6 sm:pb-11 sm:pt-8">
          <Breadcrumbs crumbs={crumbs} />

          <header className="mt-5 max-w-3xl">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-brand">
              {project.category}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {project.h1}
            </h1>
            <p className="pk-prose mt-3 text-base">{project.intro}</p>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<PlannerSkeleton />}>
          <ProjectPlanner slug={project.slug} />
        </Suspense>

        {project.disclaimers?.length ? (
          <div className="mt-10 flex gap-3 rounded-[var(--radius-card)] border border-accent/25 bg-accent-soft p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-ink">Before you build</h2>
              {project.disclaimers.map((disclaimer) => (
                <p key={disclaimer} className="mt-1 text-sm text-ink-muted">
                  {disclaimer}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-12">
          <AdSlot placement="content-mid" />
        </div>

        {/*
          The method, as static HTML. The planner above is a client component,
          so without this a crawler sees the heading, the disclaimer, and the
          FAQ — and none of the formulas or assumptions that are the substance
          of the page.
        */}
        <PlannerMethod project={project} />

        {/*
          Answer pages for this planner.

          Without this module the answer pages would have exactly one inbound
          link each — from the sitemap — and the planner would gain nothing from
          their existence. This is the link surface that makes the pair work in
          both directions: the question page catches the search, the hub
          collects the authority.
        */}
        {answers.length > 0 ? (
          <section aria-labelledby="answers-heading" className="pk-no-print mt-14 max-w-3xl">
            <h2 id="answers-heading" className="text-2xl font-semibold tracking-tight text-ink">
              Common {project.name.toLowerCase()} questions, answered
            </h2>
            <p className="pk-prose mt-2 text-sm">
              Worked examples at the sizes people ask about most, using this same calculator.
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {answers.map((answer) => (
                <li key={answer.slug}>
                  <Link
                    href={`/${project.slug}/${answer.slug}`}
                    className="group flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/35 hover:bg-brand-soft/40"
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium text-ink">{answer.h1}</span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Marketing and browsing sections are not worth the paper. */}
        <div className="pk-no-print mt-12 max-w-3xl">
          <FaqSection items={project.faq} />
        </div>

        {related.length > 0 ? (
          <section aria-labelledby="related-heading" className="pk-no-print mt-14">
            <h2 id="related-heading" className="text-2xl font-semibold tracking-tight text-ink">
              What usually comes next
            </h2>
            <p className="pk-prose mt-2 text-sm">
              Projects that tend to follow a {project.name.toLowerCase()} job.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProjectCard key={item.slug} project={item} />
              ))}
            </div>
          </section>
        ) : null}

        <p className="pk-prose mt-14 max-w-3xl text-xs">
          {legal.planningDisclaimer}{" "}
          <Link href="/terms" className="underline underline-offset-4">
            Read the full terms
          </Link>
          .
        </p>
      </div>
    </>
  );
}

/**
 * The planner reads the URL for prefill values, which means it renders on the
 * client. This placeholder mirrors its real shape — a form column and a result
 * column of roughly the right height — so the tool settles into place instead
 * of jumping when it arrives.
 */
function PlannerSkeleton() {
  return (
    /*
     * The min-height keeps whatever follows the planner — the disclaimer card,
     * the FAQ — below the fold while the real planner loads. Without it that
     * content sits just inside the viewport and is shoved down when the planner
     * arrives, which measured as 0.12 CLS on a desktop viewport.
     *
     * It has to be at least a viewport tall, not a fixed 44rem. A flat 44rem is
     * only "below the fold" on the viewport it was tuned for: on a 1600px-tall
     * window the FAQ and related-projects sections were visible at first paint
     * and their displacement measured 0.18–0.22 CLS on every planner route.
     * `100svh` makes the reservation follow the window instead of guessing at
     * it, and the 44rem floor keeps the skeleton looking deliberate on a short
     * one. The real planner is 3,800–7,500px tall, so it always overflows this
     * — the reservation is about what is *visible*, not about matching height.
     */
    <div
      aria-hidden
      className="grid min-h-[max(44rem,100svh)] grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start"
    >
      <div className="pk-card animate-pulse p-5 sm:p-6">
        <div className="h-6 w-32 rounded bg-surface-sunken" />
        <div className="mt-5 space-y-5">
          {[0, 1, 2].map((row) => (
            <div key={row}>
              <div className="h-3.5 w-24 rounded bg-surface-sunken" />
              <div className="mt-2 h-11 rounded-lg bg-surface-sunken" />
            </div>
          ))}
        </div>
        <div className="mt-8 h-11 rounded-lg bg-surface-sunken" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="h-[9.5rem] animate-pulse rounded-[var(--radius-card)] bg-brand-soft/60" />
        <div className="pk-card animate-pulse p-5 sm:p-6">
          <div className="h-5 w-40 rounded bg-surface-sunken" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-4 rounded bg-surface-sunken" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
