import Link from "next/link";
import { ArrowRight, Ruler } from "lucide-react";
import type { ReactNode } from "react";
import type { AnswerPage } from "@/types/answer";
import type { ProjectDefinition } from "@/types/project";
import type { Computed } from "@/lib/answers/compute";
import { MaterialSwatch } from "@/components/brand/MaterialSwatch";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FaqSection } from "@/components/ui/FaqSection";
import { legal } from "@/config/site";

/**
 * The frame every answer page shares: header, assumptions, planner hand-off,
 * FAQ, links, disclaimer.
 *
 * The *answer* is not in here. Each kind of question gets its own body, because
 * a size question, a comparison and a unit conversion want genuinely different
 * shapes — and a single template stretched over all three is what makes
 * programmatic pages feel like programmatic pages.
 *
 * The visual language is the site's own: ruled drafting paper behind the
 * header, the planner's material as a band, mono for labels.
 */
export function AnswerShell({
  answer,
  project,
  computed,
  children,
  answerLine,
}: {
  answer: AnswerPage;
  project: ProjectDefinition;
  computed: Computed;
  /** The body: the actual answer, rendered per kind. */
  children: ReactNode;
  /** One sentence stating the answer, for the top of the page. */
  answerLine: ReactNode;
}) {
  const plannerHref = `/${project.slug}?${new URLSearchParams(
    Object.entries(answer.prefill).map(([key, value]) => [key, String(value)]),
  ).toString()}`;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.seo.breadcrumb, path: `/${project.slug}` },
    { name: answer.seo.breadcrumb, path: `/${project.slug}/${answer.slug}` },
  ];

  return (
    <>
      <div className="relative overflow-hidden border-b border-line bg-surface">
        <div
          className="pk-rule-grid pk-rule-fade absolute inset-0"
          aria-hidden
        />
        <MaterialSwatch
          accent={project.accent}
          id={`answer-${answer.slug}`}
          scale={26}
          className="absolute inset-x-0 top-0 h-1.5 w-full opacity-60"
        />

        <div className="relative mx-auto max-w-3xl px-4 pb-9 pt-7 sm:px-6 sm:pb-11 sm:pt-8">
          <Breadcrumbs crumbs={crumbs} />
          <p className="mt-5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-brand">
            {project.name} · Answer
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {answer.h1}
          </h1>

          {/*
            The answer, immediately, before any explanation. Someone who came
            from a search result wants the number in the first screen — if they
            have to read three paragraphs to reach it, the page has failed them
            whatever it does for rankings.
          */}
          <p className="mt-4 text-lg leading-snug text-ink">{answerLine}</p>
          <p className="pk-prose mt-3 text-[0.9375rem]">{answer.intro}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-9 sm:px-6 sm:py-11">
        <div className="flex flex-col gap-11">
          {children}

          {/* ------------------------------------------------ assumptions */}
          <section aria-labelledby="assumptions-heading">
            <h2
              id="assumptions-heading"
              className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              What this assumes
            </h2>
            <p className="pk-prose mt-2 text-sm">
              Everything below is a planning convention rather than a
              measurement, and every one of them is editable in the planner.
              They are listed because an estimate you cannot interrogate is not
              worth much.
            </p>
            <dl className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
              {computed.result.assumptions.map((assumption) => (
                <div
                  key={assumption.label}
                  className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                >
                  <dt className="text-sm text-ink-muted">{assumption.label}</dt>
                  <dd className="shrink-0 font-mono text-sm font-medium text-ink">
                    {assumption.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* -------------------------------------------------- hand-off */}
          <section
            aria-labelledby="planner-heading"
            className="rounded-[var(--radius-card)] border border-brand/25 bg-brand-soft p-5 sm:p-6"
          >
            <h2
              id="planner-heading"
              className="text-xl font-semibold tracking-tight text-brand-ink sm:text-2xl"
            >
              Run it with your own numbers
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-brand-ink/85">
              This page answers one set of dimensions. The planner takes yours —
              and adds the budget at your prices, a shopping list, the order of
              work, and a Project Pack you can print or take to the store.
            </p>
            <Link href={plannerHref} className="pk-btn pk-btn-primary mt-5">
              <Ruler className="h-4 w-4" aria-hidden />
              Open the {project.name.toLowerCase()} planner
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="mt-2.5 text-xs text-brand-ink/70">
              Opens prefilled with the figures on this page. No account, free in
              beta.
            </p>
          </section>

          {/* ------------------------------------------------------- faq */}
          {answer.faq.length > 0 ? <FaqSection items={answer.faq} /> : null}

          {/* -------------------------------------------------- related */}
          <section aria-labelledby="related-heading">
            <h2
              id="related-heading"
              className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              Related questions
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {/*
                The parent planner always leads, then the curated links —
                deduplicated by href, because a definition that also lists its
                own planner would otherwise render it twice.
              */}
              {[
                {
                  href: `/${project.slug}`,
                  label: `${project.name} calculator`,
                  note: "The full planner, any dimensions",
                },
                ...answer.related,
              ]
                .filter(
                  (link, index, all) =>
                    all.findIndex((other) => other.href === link.href) ===
                    index,
                )
                .map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/35 hover:bg-brand-soft/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">
                          {link.label}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {link.note}
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>

          <p className="pk-prose max-w-prose text-xs">
            {legal.planningDisclaimer}{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Read the full terms
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------- shared bits -- */

/** The headline figure, sized to be the first thing read. */
export function BigNumber({
  label,
  value,
  note,
  tone = "brand",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "brand" | "plain";
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border p-5 ${
        tone === "brand"
          ? "border-brand/25 bg-brand-soft"
          : "border-line bg-surface"
      }`}
    >
      <p
        className={`font-mono text-[0.625rem] uppercase tracking-[0.14em] ${
          tone === "brand" ? "text-brand-ink/70" : "text-ink-subtle"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-[2.25rem] font-semibold leading-none tracking-tight tabular-nums ${
          tone === "brand" ? "text-brand-ink" : "text-ink"
        }`}
      >
        {value}
      </p>
      {note ? (
        <p
          className={`mt-1.5 text-sm leading-snug ${
            tone === "brand" ? "text-brand-ink/80" : "text-ink-muted"
          }`}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
