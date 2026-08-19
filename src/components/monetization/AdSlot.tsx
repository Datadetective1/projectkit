"use client";

import { adsConfig, features } from "@/config/site";

export type AdPlacement = "result-below-summary" | "content-mid" | "related-projects";

/**
 * Reusable ad slot.
 *
 * Renders nothing at all unless advertising is explicitly enabled, and reserves
 * a fixed height when it does so it can never cause layout shift. Never placed
 * inside the calculator itself.
 */
export function AdSlot({
  placement,
  className = "",
}: {
  placement: AdPlacement;
  className?: string;
}) {
  if (!features.ads) return null;

  const configured = Boolean(adsConfig.clientId);

  return (
    <aside
      aria-label="Advertisement"
      data-ad-placement={placement}
      className={`pk-no-print flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-sunken/60 px-4 py-6 ${className}`}
    >
      <p className="text-center text-xs uppercase tracking-wide text-ink-subtle">
        {configured ? "Advertisement" : `Ad slot — ${placement}`}
      </p>
    </aside>
  );
}
