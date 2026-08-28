"use client";

import { ExternalLink } from "lucide-react";
import { affiliateConfig, affiliateSearchUrl } from "@/config/site";

/**
 * Affiliate outbound CTA.
 *
 * The destination is configuration-driven and defaults to a plain web search,
 * so nothing here implies a retailer relationship that does not exist.
 *
 * **This no longer emits `retailer_click`,** and the omission is the point.
 * That event is the terminal step of the funnel and has to mean one thing:
 * somebody clicked through to an approved retailer. This button cannot say
 * which retailer it sent them to, because with nothing configured it sends them
 * to a web search — so counting it would mix clicks that can never become
 * affiliate revenue into the number that is meant to predict it. The type
 * enforces this rather than a comment: the retailer-click event now requires a
 * `RetailerId`, and this component has none to give.
 *
 * The per-material links in WhereToBuy are the tracked surface, and they name
 * their retailer.
 *
 * Left alone deliberately, because it is a monetization question rather than a
 * measurement one: with no partner configured this link is a web search wearing
 * `rel="sponsored"`, which is a claim in the wrong direction. Worth deciding
 * on its own terms — either give it an approved destination or retire it.
 */
export function ShopMaterials({
  query,
  label = "Shop materials",
  className = "",
  variant = "secondary",
}: {
  /** Search term for the retailer. Never sent to analytics. */
  query: string;
  /**
   * Still accepted, no longer read.
   *
   * Both were only ever used to describe a `retailer_click` this component
   * should not have been emitting. They stay in the signature so the existing
   * call site keeps compiling, and so a future approved retailer here would
   * have them to hand.
   */
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
        className={`pk-btn ${variant === "primary" ? "pk-btn-primary" : "pk-btn-secondary"}`}
      >
        {label}
        <ExternalLink className="h-4 w-4" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      {affiliateConfig.partnerLabel ? (
        <p className="mt-2 text-xs text-ink-subtle">
          {affiliateConfig.partnerLabel} — Cubitora may earn a commission from purchases made
          through this link.
        </p>
      ) : null}
    </div>
  );
}
