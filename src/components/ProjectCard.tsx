import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
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
import { MATERIAL_COLOR, MaterialSwatch } from "@/components/brand/MaterialSwatch";
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
 * Hover tint per material, as static class strings so Tailwind's scanner keeps
 * them. Kept deliberately faint: the swatch above already carries the identity,
 * and this only has to acknowledge the pointer.
 */
const HOVER_TINT: Record<AccentToken, string> = {
  stone: "group-hover:border-mat-stone/40",
  cedar: "group-hover:border-mat-cedar/40",
  pigment: "group-hover:border-mat-pigment/40",
  oak: "group-hover:border-mat-oak/40",
  bark: "group-hover:border-mat-bark/40",
  slate: "group-hover:border-mat-slate/40",
  chalk: "group-hover:border-mat-chalk/40",
  ceramic: "group-hover:border-mat-ceramic/40",
  timber: "group-hover:border-mat-timber/40",
  grass: "group-hover:border-mat-grass/40",
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
      className={`grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface ${className}`}
    >
      <Icon
        className={`h-[1.375rem] w-[1.375rem] ${MATERIAL_COLOR[project.accent]}`}
        strokeWidth={1.75}
      />
    </span>
  );
}

/**
 * One planner, as a card.
 *
 * The card now leads with a **swatch of the material** rather than a small
 * glyph on white. Ten cards that differ only by icon colour scan as one
 * repeated template; a band of aggregate, of cedar pickets, of laid tile makes
 * the grid browsable without reading — which is what a grid of ten is for.
 *
 * The swatch is inline SVG tiled by the browser, so the visual weight costs no
 * requests and cannot shift the layout when it arrives.
 *
 * On hover the card lifts and the swatch deepens, so the whole tile responds
 * rather than just the arrow. Both are suppressed under reduced motion.
 */
export function ProjectCard({ project }: { project: ProjectDefinition }) {
  const Icon = ICONS[project.icon] ?? Square;

  return (
    <Link
      href={`/${project.slug}`}
      className={`group pk-card flex w-full flex-row overflow-hidden transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_-14px_rgb(6_48_42_/_0.3)] focus-visible:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 sm:flex-col ${HOVER_TINT[project.accent]}`}
    >
      {/*
        A row on a phone, a tile from `sm` up.

        Ten stacked tiles with a full-width swatch each turned the homepage into
        an 8,500px scroll, which is decoration charging rent. As a row the
        swatch still carries the material identity at a glance, the list stays
        browsable with a thumb, and the section costs a third of the height.
      */}
      <div className="relative w-[5.5rem] shrink-0 self-stretch overflow-hidden border-r border-line bg-surface-sunken sm:h-20 sm:w-full sm:self-auto sm:border-b sm:border-r-0">
        <MaterialSwatch
          accent={project.accent}
          id={project.slug}
          scale={22}
          className="absolute inset-0 h-full w-full opacity-[0.42] transition-opacity duration-300 group-hover:opacity-70"
        />
        {/* The glyph sits on the material, in a chip, so it stays readable
            whatever the texture underneath is doing. */}
        <span
          aria-hidden
          className="absolute bottom-2 left-2 grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface/95 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0 sm:bottom-2.5 sm:left-3"
        >
          <Icon className={`h-[1.125rem] w-[1.125rem] ${MATERIAL_COLOR[project.accent]}`} strokeWidth={1.75} />
        </span>
      </div>

      {/* ---------------------------------------------------------- body */}
      <div className="flex min-w-0 flex-1 items-center gap-3 p-4 sm:block">
        <div className="flex min-w-0 flex-1 flex-col sm:h-full">
          <h3 className="text-[1.0625rem] font-semibold tracking-tight text-ink">{project.name}</h3>
          {/* Clamped rather than left to truncate mid-word, which is what a
              five-across grid did to the longer taglines. */}
          <p className="mt-1 line-clamp-2 flex-1 text-sm leading-snug text-ink-muted">
            {project.tagline}
          </p>
          {/*
            "Plan it" earns its place on a pointer device, where it is the
            hover target. On a phone the whole row is the tap target and the
            words are just ten extra lines of scroll, so the chevron says the
            same thing in the space it deserves.
          */}
          <span className="mt-3.5 hidden items-center gap-1.5 text-sm font-medium text-brand sm:inline-flex">
            Plan it
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
              aria-hidden
            />
          </span>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-subtle sm:hidden" aria-hidden />
      </div>
    </Link>
  );
}
