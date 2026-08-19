import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { getProject, projects } from "@/data/projects";
import { parseWithRules, type ParsedProject } from "@/lib/ai/parseProject";
import { isAiConfigured, parseWithAi } from "@/lib/ai/claude";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Plan your project",
  description: "Describe your project and ProjectKit routes you to the right planner.",
  path: "/plan",
  index: false,
});

/**
 * Natural-language entry point.
 *
 * Works entirely without JavaScript: the homepage form submits here with GET.
 * The deterministic parser runs first and handles most phrasings on its own;
 * Claude is consulted only when the rules find nothing and a key is present.
 */
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (raw ?? "").trim().slice(0, 300);

  if (!query) {
    return <PlanShell query="" message="Tell us what you're building and we'll take it from there." />;
  }

  const rules = parseWithRules(query);
  let parsed: ParsedProject | undefined = rules.parsed;

  // Only pay for a model call when pattern matching genuinely came up short.
  if ((!parsed || parsed.confidence === "low") && isAiConfigured()) {
    const aiParsed = await parseWithAi(query);
    if (aiParsed) parsed = aiParsed;
  }

  if (parsed && parsed.confidence !== "low") {
    const search = new URLSearchParams(parsed.fields);
    search.set("from", "nl");
    redirect(`/${parsed.slug}?${search.toString()}`);
  }

  // We know the project but not the numbers — send them there anyway, unfilled.
  if (parsed) {
    const search = new URLSearchParams(parsed.fields);
    search.set("from", "nl");
    const project = getProject(parsed.slug);
    return (
      <PlanShell
        query={query}
        message={
          project
            ? `That sounds like a ${project.name.toLowerCase()} project, but we could not pull any measurements out of it.`
            : undefined
        }
        suggestion={
          project
            ? { href: `/${parsed.slug}?${search.toString()}`, label: `Open the ${project.name} planner` }
            : undefined
        }
      />
    );
  }

  return (
    <PlanShell
      query={query}
      message="We could not tell which project that is. Pick one below and you will be planning in seconds."
    />
  );
}

function PlanShell({
  query,
  message,
  suggestion,
}: {
  query: string;
  message?: string;
  suggestion?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-ink">
          <Sparkles className="h-4 w-4" aria-hidden />
          Project router
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Let&apos;s find the right planner
        </h1>
        {message ? <p className="pk-prose mx-auto mt-3 max-w-xl">{message}</p> : null}
      </div>

      <form action="/plan" method="get" className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle"
          />
          <label htmlFor="plan-query" className="sr-only">
            Describe your project
          </label>
          <input
            id="plan-query"
            name="q"
            type="text"
            required
            maxLength={300}
            defaultValue={query}
            placeholder="I want to build a 20 × 16 concrete patio"
            className="pk-field h-[3.25rem] pl-11 text-base"
          />
        </div>
        <button type="submit" className="pk-btn pk-btn-primary h-[3.25rem] px-6 text-base">
          Try again
        </button>
      </form>

      {suggestion ? (
        <div className="mt-6 text-center">
          <Link href={suggestion.href} className="pk-btn pk-btn-primary">
            {suggestion.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}

      <section aria-labelledby="all-planners" className="mt-12">
        <h2 id="all-planners" className="text-center text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          All planners
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
