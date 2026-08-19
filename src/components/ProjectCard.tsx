import Link from "next/link";
import {
  ArrowRight,
  Fence,
  Grid2x2,
  Grid3x3,
  Layers,
  LayoutPanelTop,
  Mountain,
  PaintRoller,
  Sprout,
  Square,
  Trees,
  type LucideIcon,
} from "lucide-react";
import type { AccentToken, ProjectDefinition } from "@/types/project";

const ICONS: Record<string, LucideIcon> = {
  Square,
  Fence,
  PaintRoller,
  Grid2x2,
  Trees,
  Mountain,
  LayoutPanelTop,
  Grid3x3,
  Layers,
  Sprout,
};

/** Static class strings so Tailwind's scanner keeps them. */
const ACCENTS: Record<AccentToken, string> = {
  slate: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-800",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  orange: "bg-orange-100 text-orange-800",
  sky: "bg-sky-100 text-sky-700",
  rose: "bg-rose-100 text-rose-700",
  teal: "bg-teal-100 text-teal-700",
  lime: "bg-lime-100 text-lime-800",
  indigo: "bg-indigo-100 text-indigo-700",
};

export function ProjectIcon({
  project,
  className = "",
}: {
  project: ProjectDefinition;
  className?: string;
}) {
  const Icon = ICONS[project.icon] ?? Square;
  return (
    <span
      aria-hidden
      className={`grid h-10 w-10 place-items-center rounded-xl ${ACCENTS[project.accent]} ${className}`}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

export function ProjectCard({ project }: { project: ProjectDefinition }) {
  return (
    <Link
      href={`/${project.slug}`}
      className="group pk-card flex flex-col p-5 transition-colors hover:border-brand/40 hover:bg-brand-soft/25"
    >
      <ProjectIcon project={project} />
      <h3 className="mt-4 text-base font-semibold text-ink">{project.name}</h3>
      <p className="mt-1 flex-1 text-sm text-ink-muted">{project.tagline}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
        Plan it
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
