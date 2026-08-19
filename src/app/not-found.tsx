import Link from "next/link";
import { ProjectCard } from "@/components/ProjectCard";
import { projects } from "@/data/projects";
import { pageMetadata } from "@/lib/seo";

/*
 * Without this the 404 inherits the root layout's title, so a missing page
 * announced itself in the browser tab and in shared links as the homepage.
 * Not indexed, for the obvious reason.
 */
export const metadata = pageMetadata({
  title: "Page not found",
  description:
    "That ProjectKit page does not exist. Every project planner is listed here so you can pick up where you meant to.",
  path: "/404",
  index: false,
});

export default function NotFound() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          That page isn&apos;t here
        </h1>
        <p className="pk-prose mx-auto mt-3 max-w-md">
          The link may be out of date, or the planner may have moved. Everything ProjectKit can
          plan is below.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className="pk-btn pk-btn-primary">
            Back to the homepage
          </Link>
          <Link href="/projects" className="pk-btn pk-btn-secondary">
            All planners
          </Link>
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </div>
  );
}
