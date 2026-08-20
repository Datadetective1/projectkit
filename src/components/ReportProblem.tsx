"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Flag } from "lucide-react";
import { build, feedback, site } from "@/config/site";
import { redactPathname } from "@/lib/analytics/redact";
import type { UnitSystem } from "@/lib/units";

/**
 * "Report a problem", for beta.
 *
 * Deliberately not a support system: no database, no ticket, no account. A
 * link that reaches a human is worth more right now than infrastructure nobody
 * reads, and the one thing that must not happen is a visitor spotting a bad
 * estimate and having nowhere to say so.
 *
 * What it sends is the same closed set the analytics pipeline is allowed:
 * project type, unit system, build id, and the *route*. Never the dimensions,
 * the notes, the natural-language text, or anything identifying — those are the
 * user's, and a bug report does not need them to be actionable. If the reporter
 * wants to include specifics they can type them into the message themselves,
 * which is a choice rather than a default.
 */

export function ReportProblem({
  projectType,
  system,
  className,
}: {
  projectType?: string;
  system?: UnitSystem;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  /*
   * `usePathname`, not `window.location`.
   *
   * Reading `window` during render made the server emit a mailto body without
   * the page line and the client emit one with it, so React found mismatched
   * hrefs and gave up hydrating this subtree — the first case its own hydration
   * error lists. The router's pathname is identical on both sides.
   */
  const pathname = usePathname();

  const context = [
    projectType ? `Planner: ${projectType}` : undefined,
    system ? `Units: ${system === "us" ? "US customary" : "Metric"}` : undefined,
    `Build: ${build.id}`,
    pathname ? `Page: ${site.url}${redactPathname(pathname)}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const body = [
    "What looked wrong?",
    "",
    "",
    "What did you expect instead?",
    "",
    "",
    "— details below help us reproduce it, please edit or delete anything you would rather not send —",
    context,
  ].join("\n");

  const href = feedback.url
    ? feedback.url
    : `mailto:${feedback.email}?subject=${encodeURIComponent(
        `Cubitora estimate report${projectType ? ` — ${projectType}` : ""}`,
      )}&body=${encodeURIComponent(body)}`;

  async function copyContext() {
    try {
      await navigator.clipboard.writeText(context);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked; the link still carries the context.
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${className ?? ""}`}>
      <a
        href={href}
        {...(feedback.url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="inline-flex items-center gap-1.5 text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        Does this estimate look wrong? Tell us
      </a>
      <button
        type="button"
        onClick={copyContext}
        className="text-ink-subtle underline-offset-4 hover:text-ink-muted hover:underline"
      >
        {copied ? "Copied" : "Copy build details"}
      </button>
    </div>
  );
}
