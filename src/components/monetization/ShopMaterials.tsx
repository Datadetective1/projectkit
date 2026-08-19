"use client";

import { ExternalLink } from "lucide-react";
import { affiliateConfig, affiliateSearchUrl } from "@/config/site";
import { track } from "@/lib/analytics";

/**
 * Affiliate outbound CTA.
 *
 * The destination is configuration-driven and defaults to a plain web search,
 * so nothing here implies a retailer relationship that does not exist.
 */
export function ShopMaterials({
  query,
  projectType,
  placement = "materials",
  label = "Shop materials",
  className = "",
  variant = "secondary",
}: {
  /** Search term for the retailer. Never sent to analytics. */
  query: string;
  projectType?: string;
  placement?: "results" | "materials" | "pack";
  label?: string;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  if (!affiliateConfig.enabled) return null;

  return (
    <div className={`pk-no-print ${className}`}>
      <a
        href={affiliateSearchUrl(query)}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => track("affiliate_clicked", { projectType, placement })}
        className={`pk-btn ${variant === "primary" ? "pk-btn-primary" : "pk-btn-secondary"}`}
      >
        {label}
        <ExternalLink className="h-4 w-4" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      {affiliateConfig.partnerLabel ? (
        <p className="mt-2 text-xs text-ink-subtle">
          {affiliateConfig.partnerLabel} — ProjectKit may earn a commission from purchases made
          through this link.
        </p>
      ) : null}
    </div>
  );
}
