import { ProjectCard } from "@/components/ProjectCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/ui/JsonLd";
import { projects } from "@/data/projects";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "All Project Planners",
  description:
    "Every ProjectKit planner: concrete, fence, paint, flooring, mulch, gravel, drywall, tile, deck, and sod. Quantities, costs, and shopping lists.",
  path: "/projects",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Projects", path: "/projects" },
];

export default function ProjectsPage() {
  const categories = Array.from(new Set(projects.map((project) => project.category)));

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Breadcrumbs crumbs={crumbs} />

        <header className="mt-5 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            All project planners
          </h1>
          <p className="pk-prose mt-3">
            Ten planners, one engine. Each gives you material quantities with waste, an editable
            budget, a shopping list, and a plan you can print or share — no account required.
          </p>
        </header>

        {categories.map((category) => (
          <section key={category} aria-labelledby={category} className="mt-10">
            <h2
              id={category}
              className="text-sm font-semibold uppercase tracking-wide text-ink-subtle"
            >
              {category}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {projects
                .filter((project) => project.category === category)
                .map((project) => (
                  <ProjectCard key={project.slug} project={project} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
