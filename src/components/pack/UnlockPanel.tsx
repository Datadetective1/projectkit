"use client";

import { useState } from "react";
import { Loader2, Lock, Unlock } from "lucide-react";
import { features, formatPackPrice, projectPack } from "@/config/site";
import { recordUnlock } from "@/lib/storage/entitlements";
import { track } from "@/lib/analytics";

/**
 * Project Pack unlock.
 *
 * Three states, in priority order:
 *  1. Dev unlock flag on — the pack is already open; this panel never renders.
 *  2. Stripe configured — start a test-mode Checkout session.
 *  3. Stripe not configured — explain honestly rather than pretend to sell.
 */
export function UnlockPanel({
  projectId,
  onUnlocked,
}: {
  projectId: string;
  onUnlocked: () => void;
}) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState<string>();

  async function startCheckout() {
    setState("working");
    setMessage(undefined);
    track("project_pack_checkout_started", {});

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const reason =
          data && typeof data === "object" && typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Checkout is not available right now.";
        setMessage(reason);
        setState("error");
        return;
      }

      // Development mode grants access without a payment.
      if (data && typeof data === "object" && (data as { devUnlock?: boolean }).devUnlock) {
        recordUnlock(projectId);
        onUnlocked();
        setState("idle");
        return;
      }

      const url =
        data && typeof data === "object" ? (data as { url?: string }).url : undefined;
      if (typeof url === "string" && url.startsWith("https://")) {
        window.location.href = url;
        return;
      }

      setMessage("Checkout did not return a payment link.");
      setState("error");
    } catch {
      setMessage("Could not reach the checkout service. Please try again.");
      setState("error");
    }
  }

  return (
    <section
      aria-labelledby="unlock-heading"
      className="pk-no-print rounded-[var(--radius-card)] border border-brand/25 bg-brand-soft p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2
            id="unlock-heading"
            className="flex items-center gap-2 text-lg font-semibold text-brand-ink"
          >
            <Lock className="h-5 w-5" aria-hidden />
            Download this Project Pack
          </h2>
          <p className="mt-2 text-sm text-brand-ink/85">
            You can read the whole pack below for free. The {formatPackPrice()} unlock gives you the
            polished, ad-free PDF — the one you take to the store, send to a contractor, or keep
            with your records.
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm text-brand-ink/85 sm:grid-cols-2">
            {[
              "Print-ready PDF with your quantities",
              "Complete materials and budget",
              "Tickable shopping list",
              "Assumptions and project sequence",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Unlock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full sm:w-auto">
          <button
            type="button"
            onClick={startCheckout}
            disabled={state === "working"}
            className="pk-btn pk-btn-primary w-full sm:w-auto"
          >
            {state === "working" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {features.projectPackDevUnlock
              ? "Unlock (development mode)"
              : `Unlock for ${formatPackPrice()}`}
          </button>
          <p className="mt-2 text-center text-xs text-brand-ink/70 sm:text-right">
            One-time payment · {projectPack.currency.toUpperCase()}
          </p>
        </div>
      </div>

      {message ? (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {message}
        </p>
      ) : null}
    </section>
  );
}
