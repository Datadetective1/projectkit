import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { ProjectPlanner } from "@/components/planner/ProjectPlanner";
import { ProjectCard } from "@/components/ProjectCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FaqSection } from "@/components/ui/FaqSection";
import { JsonLd } from "@/components/ui/JsonLd";
import { AdSlot } from "@/components/monetization/AdSlot";
import { getProject, projectSlugs, relatedProjects } from "@/data/projects";
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

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Breadcrumbs crumbs={crumbs} />

        <header className="mt-5 max-w-3xl">
          <p className="text-sm font-medium text-brand">{project.category}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {project.h1}
          </h1>
          <p className="pk-prose mt-3 text-base">{project.intro}</p>
        </header>

        <div className="mt-8">
          <Suspense fallback={<PlannerSkeleton />}>
            <ProjectPlanner slug={project.slug} />
          </Suspense>
        </div>

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
    <div
      aria-hidden
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start"
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
