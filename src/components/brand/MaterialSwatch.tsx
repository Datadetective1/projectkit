import type { AccentToken } from "@/types/project";

/**
 * A swatch of the material itself.
 *
 * Ten planner cards used to be ten identical white rectangles separated by a
 * small coloured glyph, and a grid of them read as a template — the eye had
 * nothing to grab. The fix is not ten illustrations, which would read as ten
 * unrelated products. It is one component, one geometry, one stroke weight, and
 * a pattern per material: planks for timber, aggregate for gravel, blades for
 * sod, a taped seam for drywall.
 *
 * That keeps a single design system while making each card recognisable at a
 * glance and, more usefully, *legible from across the room* — you can find the
 * tile planner without reading the word "tile".
 *
 * All inline SVG, tiled by the browser: no image requests, nothing to load
 * late, no layout shift, a few hundred bytes each.
 */

/** The pattern tile for each material. 24×24 user units, drawn in currentColor. */
const PATTERNS: Record<AccentToken, React.ReactNode> = {
  // Aggregate speckle — poured concrete.
  stone: (
    <>
      <circle cx="5" cy="6" r="1.4" />
      <circle cx="17" cy="4" r="1" />
      <circle cx="11" cy="13" r="1.7" />
      <circle cx="20" cy="16" r="1.2" />
      <circle cx="3" cy="18" r="1" />
      <circle cx="14" cy="21" r="1.3" />
    </>
  ),
  // Vertical pickets with a rail across them.
  cedar: (
    <>
      <rect x="2" y="0" width="4" height="24" rx="1" opacity="0.55" />
      <rect x="10" y="0" width="4" height="24" rx="1" opacity="0.55" />
      <rect x="18" y="0" width="4" height="24" rx="1" opacity="0.55" />
      <rect x="0" y="9" width="24" height="2.5" opacity="0.9" />
    </>
  ),
  /*
   * A roller sweep laid on at an angle, with the broken edge a roller actually
   * leaves. Horizontal bars read as flooring — the diagonal and the ragged end
   * are what make this legible as paint.
   */
  pigment: (
    <>
      <rect x="-4" y="3" width="26" height="6" rx="3" transform="rotate(-14 -4 3)" opacity="0.6" />
      <rect x="2" y="14" width="20" height="6" rx="3" transform="rotate(-14 2 14)" opacity="0.4" />
      <circle cx="21" cy="11" r="1.1" opacity="0.5" />
    </>
  ),
  // Board ends staggered, the way a floor is laid.
  oak: (
    <>
      <rect x="0" y="1" width="15" height="4.5" rx="0.8" opacity="0.5" />
      <rect x="16" y="1" width="8" height="4.5" rx="0.8" opacity="0.5" />
      <rect x="0" y="7.5" width="7" height="4.5" rx="0.8" opacity="0.5" />
      <rect x="8" y="7.5" width="16" height="4.5" rx="0.8" opacity="0.5" />
      <rect x="0" y="14" width="15" height="4.5" rx="0.8" opacity="0.5" />
      <rect x="16" y="14" width="8" height="4.5" rx="0.8" opacity="0.5" />
    </>
  ),
  // Shredded bark: short strokes at loose angles.
  bark: (
    <>
      <rect x="1" y="3" width="9" height="2.6" rx="1.3" transform="rotate(-12 1 3)" opacity="0.6" />
      <rect x="13" y="7" width="8" height="2.6" rx="1.3" transform="rotate(18 13 7)" opacity="0.6" />
      <rect x="3" y="13" width="10" height="2.6" rx="1.3" transform="rotate(8 3 13)" opacity="0.6" />
      <rect x="14" y="17" width="7" height="2.6" rx="1.3" transform="rotate(-20 14 17)" opacity="0.6" />
    </>
  ),
  // Graded stone: mixed sizes, loosely packed.
  slate: (
    <>
      <circle cx="6" cy="5" r="2.6" opacity="0.55" />
      <circle cx="16" cy="8" r="1.9" opacity="0.45" />
      <circle cx="4" cy="15" r="2.1" opacity="0.5" />
      <circle cx="13" cy="18" r="2.8" opacity="0.4" />
      <circle cx="21" cy="19" r="1.5" opacity="0.5" />
      <circle cx="21" cy="2" r="1.4" opacity="0.45" />
    </>
  ),
  // A taped and floated joint between two sheets.
  chalk: (
    <>
      <rect x="0" y="0" width="24" height="24" opacity="0.16" />
      <rect x="11" y="0" width="2" height="24" opacity="0.55" />
      <circle cx="6" cy="7" r="0.9" opacity="0.7" />
      <circle cx="18" cy="16" r="0.9" opacity="0.7" />
    </>
  ),
  // Set tile with a grout line.
  ceramic: (
    <>
      <rect x="1" y="1" width="10" height="10" rx="1" opacity="0.5" />
      <rect x="13" y="1" width="10" height="10" rx="1" opacity="0.5" />
      <rect x="1" y="13" width="10" height="10" rx="1" opacity="0.5" />
      <rect x="13" y="13" width="10" height="10" rx="1" opacity="0.5" />
    </>
  ),
  // Decking boards with the gap between them.
  timber: (
    <>
      <rect x="0" y="1" width="24" height="6" rx="1" opacity="0.5" />
      <rect x="0" y="9" width="24" height="6" rx="1" opacity="0.5" />
      <rect x="0" y="17" width="24" height="6" rx="1" opacity="0.5" />
      <rect x="7" y="0" width="1.4" height="24" opacity="0.35" />
    </>
  ),
  /*
   * Blades, as tapered triangles rooted at the bottom edge. Drawn as curves
   * first, which tiled into a row of arches rather than grass — a stroked path
   * reads as an outline, and a blade is a filled shape.
   */
  grass: (
    <>
      <path d="M2 24 L4.4 24 L3.6 7 Z" opacity="0.7" />
      <path d="M8 24 L10.4 24 L11.6 10 Z" opacity="0.55" />
      <path d="M13.5 24 L15.9 24 L14.2 5 Z" opacity="0.7" />
      <path d="M19 24 L21.4 24 L22.4 12 Z" opacity="0.5" />
      <path d="M5.5 24 L7.2 24 L7.6 15 Z" opacity="0.4" />
      <path d="M16.5 24 L18.2 24 L17.4 16 Z" opacity="0.4" />
    </>
  ),
};

/** The material colour for each token. Kept in CSS so both stay in one place. */
export const MATERIAL_COLOR: Record<AccentToken, string> = {
  stone: "text-mat-stone",
  cedar: "text-mat-cedar",
  pigment: "text-mat-pigment",
  oak: "text-mat-oak",
  bark: "text-mat-bark",
  slate: "text-mat-slate",
  chalk: "text-mat-chalk",
  ceramic: "text-mat-ceramic",
  timber: "text-mat-timber",
  grass: "text-mat-grass",
};

export function MaterialSwatch({
  accent,
  id,
  className = "",
  scale = 24,
}: {
  accent: AccentToken;
  /** Unique per instance: SVG pattern ids are document-global. */
  id: string;
  className?: string;
  scale?: number;
}) {
  const patternId = `pk-mat-${accent}-${id}`;

  return (
    <svg aria-hidden className={`${MATERIAL_COLOR[accent]} ${className}`} preserveAspectRatio="none">
      <defs>
        <pattern
          id={patternId}
          width={scale}
          height={scale}
          patternUnits="userSpaceOnUse"
        >
          <g fill="currentColor">{PATTERNS[accent]}</g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
