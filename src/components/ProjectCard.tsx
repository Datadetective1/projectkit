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

/**
 * Per-project accent, used on the glyph only.
 *
 * Ten filled pastel squares differentiated the planners but made a grid of them
 * read as a template. The colour now lives in the icon against a neutral tile,
 * and the tile picks the colour up on hover — restrained at rest, and the
 * differentiation is still there when you scan for it.
 *
 * Static class strings so Tailwind's scanner keeps them.
 */
const ACCENTS: Record<AccentToken, { glyph: string; tile: string }> = {
  slate: { glyph: "text-slate-600", tile: "group-hover:bg-slate-100" },
  amber: { glyph: "text-amber-700", tile: "group-hover:bg-amber-100" },
  violet: { glyph: "text-violet-600", tile: "group-hover:bg-violet-100" },
  emerald: { glyph: "text-emerald-700", tile: "group-hover:bg-emerald-100" },
  orange: { glyph: "text-orange-700", tile: "group-hover:bg-orange-100" },
  sky: { glyph: "text-sky-700", tile: "group-hover:bg-sky-100" },
  rose: { glyph: "text-rose-600", tile: "group-hover:bg-rose-100" },
  teal: { glyph: "text-teal-700", tile: "group-hover:bg-teal-100" },
  lime: { glyph: "text-lime-700", tile: "group-hover:bg-lime-100" },
  indigo: { glyph: "text-indigo-600", tile: "group-hover:bg-indigo-100" },
};

export function ProjectIcon({
  project,
  className = "",
}: {
  project: ProjectDefinition;
  className?: string;
}) {
  const Icon = ICONS[project.icon] ?? Square;
  const accent = ACCENTS[project.accent];
  return (
    <span
      aria-hidden
      className={`grid h-11 w-11 place-items-center rounded-xl bg-surface-sunken transition-colors ${accent.tile} ${className}`}
    >
      <Icon className={`h-[1.375rem] w-[1.375rem] ${accent.glyph}`} strokeWidth={1.75} />
    </span>
  );
}

export function ProjectCard({ project }: { project: ProjectDefinition }) {
  return (
    <Link
      href={`/${project.slug}`}
      className="group pk-card flex flex-col p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-[0_6px_20px_-8px_rgb(15_95_82_/_0.18)] focus-visible:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0"
    >
      <ProjectIcon project={project} />
      <h3 className="mt-4 text-[1.0625rem] font-semibold tracking-tight text-ink">
        {project.name}
      </h3>
      {/* Clamped rather than left to truncate mid-word, which is what a
          five-across grid did to the longer taglines. */}
      <p className="mt-1 line-clamp-2 flex-1 text-sm leading-snug text-ink-muted">
        {project.tagline}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
        Plan it
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
          aria-hidden
        />
      </span>
    </Link>
  );
}
