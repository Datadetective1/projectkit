"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Route-level error boundary.
 *
 * A failure in one page should not take the site down — the header, the
 * footer, and every other planner keep working.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side details stay on the server; the digest is the shared handle.
    console.error("[projectkit] route error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div className="pk-card p-8">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          Something went wrong on this page
        </h1>
        <p className="pk-prose mt-2 text-sm">
          Your saved projects are stored in this browser and are unaffected. Try again, or start
          from a planner.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-subtle">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="pk-btn pk-btn-primary">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <Link href="/projects" className="pk-btn pk-btn-secondary">
            All planners
          </Link>
          <Link href="/my-projects" className="pk-btn pk-btn-secondary">
            My projects
          </Link>
        </div>
      </div>
    </div>
  );
}
