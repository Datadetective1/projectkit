/**
 * The Cubitora mark: a drafting dimension line.
 *
 * `|←—— 20 ft ——→|` — the notation every measured drawing uses. It is the motif
 * because it is literally what the product does: take a real-world measurement
 * and annotate it. A gradient would have been faster to draw and would have
 * said nothing.
 *
 * Server-rendered SVG with no dependencies. The line draws itself when its
 * container is revealed (see `.pk-draw` in globals.css); with reduced motion it
 * is simply already drawn.
 */
export function DimensionLine({
  label,
  className = "",
  orientation = "horizontal",
  delay = 0,
}: {
  label: string;
  className?: string;
  orientation?: "horizontal" | "vertical";
  delay?: number;
}) {
  if (orientation === "vertical") {
    return (
      <span className={`inline-flex flex-col items-center ${className}`} aria-hidden>
        <svg width="14" height="100%" viewBox="0 0 14 64" preserveAspectRatio="none" className="h-full">
          <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55">
            <line x1="1" y1="1" x2="13" y2="1" />
            <line x1="1" y1="63" x2="13" y2="63" />
            <line
              className="pk-draw"
              style={{ "--pk-draw-length": 62, "--pk-delay": `${delay}ms` } as React.CSSProperties}
              x1="7"
              y1="1"
              x2="7"
              y2="63"
            />
          </g>
        </svg>
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span aria-hidden className="flex-1">
        <svg width="100%" height="10" viewBox="0 0 120 10" preserveAspectRatio="none" className="block">
          <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55">
            {/* Extension ticks at each end, then the measure between them. */}
            <line x1="0.5" y1="1" x2="0.5" y2="9" />
            <line x1="119.5" y1="1" x2="119.5" y2="9" />
            <line
              className="pk-draw"
              style={{ "--pk-draw-length": 119, "--pk-delay": `${delay}ms` } as React.CSSProperties}
              x1="0.5"
              y1="5"
              x2="119.5"
              y2="5"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      </span>
      <span className="shrink-0 font-mono text-[0.6875rem] uppercase tracking-wider">{label}</span>
      <span aria-hidden className="flex-1">
        <svg width="100%" height="10" viewBox="0 0 120 10" preserveAspectRatio="none" className="block">
          <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55">
            <line x1="0.5" y1="1" x2="0.5" y2="9" />
            <line x1="119.5" y1="1" x2="119.5" y2="9" />
            <line
              className="pk-draw"
              style={{ "--pk-draw-length": 119, "--pk-delay": `${delay}ms` } as React.CSSProperties}
              x1="0.5"
              y1="5"
              x2="119.5"
              y2="5"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      </span>
    </span>
  );
}

/**
 * A measured plan view: a rectangle with its two dimensions annotated.
 *
 * Used wherever a project has a footprint — the hero, and the concrete card.
 * It is the same drawing a person sketches on the back of an envelope before
 * they start, which is the moment this product is for.
 */
export function PlanDiagram({
  width,
  depth,
  className = "",
}: {
  width: string;
  depth: string;
  className?: string;
}) {
  /*
   * SVG pattern ids are document-global, so two diagrams sharing one id means
   * the second silently borrows the first's fill. Derived from the dimensions
   * rather than random, to stay stable between server and client render; two
   * diagrams with identical dimensions would produce an identical pattern
   * anyway, so a collision there costs nothing.
   */
  const patternId = `pk-hatch-${`${width}-${depth}`.replace(/[^a-z0-9]+/gi, "")}`;

  return (
    <svg
      viewBox="0 0 200 132"
      className={className}
      role="img"
      aria-label={`Plan view, ${width} by ${depth}`}
    >
      {/* Hatched fill — the drafting convention for a material section. */}
      <defs>
        <pattern id={patternId} width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
        </pattern>
      </defs>

      <rect x="26" y="24" width="148" height="82" fill={`url(#${patternId})`} opacity="1" />
      <rect
        className="pk-draw"
        style={{ "--pk-draw-length": 460 } as React.CSSProperties}
        x="26"
        y="24"
        width="148"
        height="82"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity="0.95"
      />

      <g stroke="currentColor" strokeWidth="1.1" opacity="0.7">
        {/* Width dimension, below. */}
        <line x1="26" y1="114" x2="26" y2="122" />
        <line x1="174" y1="114" x2="174" y2="122" />
        <line
          className="pk-draw"
          style={{ "--pk-draw-length": 148, "--pk-delay": "150ms" } as React.CSSProperties}
          x1="26"
          y1="118"
          x2="174"
          y2="118"
        />
        {/* Depth dimension, to the left. */}
        <line x1="10" y1="24" x2="18" y2="24" />
        <line x1="10" y1="106" x2="18" y2="106" />
        <line
          className="pk-draw"
          style={{ "--pk-draw-length": 82, "--pk-delay": "225ms" } as React.CSSProperties}
          x1="14"
          y1="24"
          x2="14"
          y2="106"
        />
      </g>

      {/* Each label fades in behind the line that measures it. */}
      <text
        x="100"
        y="130"
        textAnchor="middle"
        className="pk-fade-in fill-current font-mono text-[10px]"
        style={{ "--pk-delay": "260ms" } as React.CSSProperties}
      >
        {width}
      </text>
      <text
        x="14"
        y="65"
        textAnchor="middle"
        transform="rotate(-90 14 65)"
        className="pk-fade-in fill-current font-mono text-[10px]"
        style={{ "--pk-delay": "330ms" } as React.CSSProperties}
      >
        {depth}
      </text>
    </svg>
  );
}
