"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Download, Loader2, Printer } from "lucide-react";
import { UnlockPanel } from "./UnlockPanel";
import { buildPack, packFileName, type ProjectPack } from "@/lib/pack/buildPack";
import { useSavedProject, useStorageReady } from "@/lib/storage/useSavedProjects";
import { isPackUnlocked, recordUnlock } from "@/lib/storage/entitlements";
import { track } from "@/lib/analytics";
import { site } from "@/config/site";

type DownloadState = "idle" | "working" | "error";

export function PackPreview({ id }: { id: string }) {
  const ready = useStorageReady();
  const saved = useSavedProject(id);
  const pack = useMemo(() => (saved ? buildPack(saved) : undefined), [saved]);
  const slug = saved?.slug;

  const [purchased, setPurchased] = useState(false);
  const [download, setDownload] = useState<DownloadState>("idle");
  const unlocked = purchased || isPackUnlocked(id);

  useEffect(() => {
    if (slug) track("project_pack_opened", { projectType: slug });
  }, [slug]);

  // Returning from Stripe checkout: verify the session before unlocking.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`,
        );
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (cancelled) return;
        if (data && typeof data === "object" && (data as { paid?: boolean }).paid) {
          recordUnlock(id, sessionId);
          setPurchased(true);
          track("project_pack_purchased", {});
        }
      } catch {
        // Leave the pack locked; the user can retry from the unlock panel.
      } finally {
        // Drop the session id so a refresh does not re-verify.
        const url = new URL(window.location.href);
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDownload() {
    if (!pack) return;
    setDownload("working");
    try {
      // Loaded on demand: the PDF renderer is far too large for the initial bundle.
      const [{ pdf }, { PackDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./PackDocument"),
      ]);
      const blob = await pdf(<PackDocument pack={pack} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = packFileName(pack);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDownload("idle");
      track("project_pack_downloaded", { projectType: slug });
    } catch {
      setDownload("error");
    }
  }

  if (!ready) {
    return (
      <div className="pk-card animate-pulse p-8">
        <p className="text-sm text-ink-muted">Loading your project pack…</p>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="pk-card p-8">
        <h1 className="text-xl font-semibold text-ink">We could not find that project</h1>
        <p className="pk-prose mt-2 text-sm">
          Project packs are built from projects saved in this browser. If you saved it somewhere
          else — a different device, or a private window — it will not be here.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/my-projects" className="pk-btn pk-btn-secondary">
            My projects
          </Link>
          <Link href="/projects" className="pk-btn pk-btn-primary">
            Start a new project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="pk-no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href={slug ? `/${slug}?saved=${id}` : "/my-projects"}
          className="pk-btn pk-btn-ghost -ml-3"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to the planner
        </Link>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="pk-btn pk-btn-secondary">
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </button>
          {unlocked ? (
            <button
              type="button"
              onClick={handleDownload}
              disabled={download === "working"}
              className="pk-btn pk-btn-primary"
            >
              {download === "working" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              {download === "working" ? "Building PDF…" : "Download PDF"}
            </button>
          ) : null}
        </div>
      </div>

      {download === "error" ? (
        <p role="alert" className="pk-no-print text-sm text-danger">
          The PDF could not be generated in this browser. Printing this page produces the same
          document.
        </p>
      ) : null}

      {!unlocked ? <UnlockPanel projectId={id} onUnlocked={() => setPurchased(true)} /> : null}

      <article className="pk-card overflow-hidden">
        <PackHeader pack={pack} />

        <div className="grid gap-8 p-6 sm:p-8">
          <PackHero pack={pack} />
          <PackRows title="Project summary" rows={pack.summary} />
          <PackMaterials pack={pack} />
          {pack.scenarios.length > 0 ? <PackScenarios pack={pack} /> : null}
          <PackChecklist pack={pack} />
          <PackSteps pack={pack} />
          <PackRows title="Assumptions used" rows={pack.assumptions} />
          <PackRows title="How it was calculated" rows={pack.formulas} mono />
          {pack.warnings.length > 0 ? <PackWarnings pack={pack} /> : null}
          <PackNotes pack={pack} />
          <p className="border-t border-line pt-5 text-xs text-ink-subtle">{pack.disclaimer}</p>
        </div>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------- sections -- */

function PackHeader({ pack }: { pack: ProjectPack }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface-sunken/50 px-6 py-5 sm:px-8">
      <div>
        <p className="text-base font-semibold text-brand">{pack.brand}</p>
        <p className="mt-0.5 max-w-xs text-xs text-ink-subtle">{pack.tagline}</p>
      </div>
      <div className="text-right">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-subtle">
          Project pack
        </p>
        <p className="text-sm text-ink-muted">{pack.createdAt}</p>
      </div>
    </header>
  );
}

function PackHero({ pack }: { pack: ProjectPack }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{pack.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {pack.category} · {pack.effort.difficulty} · {pack.effort.timeCategory}
      </p>
      <div className="mt-5 rounded-xl bg-brand-soft p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/70">
          {pack.headline.label}
        </p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-brand-ink">
          {pack.headline.value}
        </p>
        {pack.headline.sublabel ? (
          <p className="mt-1.5 text-sm text-brand-ink/80">{pack.headline.sublabel}</p>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-line pb-2 text-base font-semibold text-ink">{children}</h2>
  );
}

function PackRows({
  title,
  rows,
  mono = false,
}: {
  title: string;
  rows: ProjectPack["summary"];
  mono?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <dl className="mt-2 divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-x-6 gap-y-0.5 py-2">
            <dt className="text-sm text-ink-muted">
              {row.label}
              {row.note ? (
                <span className="ml-2 text-xs text-ink-subtle">{row.note}</span>
              ) : null}
            </dt>
            <dd
              className={`text-right text-sm font-medium text-ink ${mono ? "font-mono text-xs" : "tabular-nums"}`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PackMaterials({ pack }: { pack: ProjectPack }) {
  return (
    <section>
      <SectionTitle>Materials &amp; budget</SectionTitle>
      <ul className="mt-2 divide-y divide-line">
        {pack.materials.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex flex-wrap gap-x-6 gap-y-1 py-2.5">
            <div className="min-w-[9rem] flex-1">
              <p className="text-sm font-medium text-ink">
                {item.name}
                {item.isEstimate ? (
                  <span className="ml-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-accent">
                    Estimate
                  </span>
                ) : null}
              </p>
              {item.note ? <p className="text-xs text-ink-subtle">{item.note}</p> : null}
            </div>
            <p className="min-w-[5rem] text-right text-sm font-medium tabular-nums text-ink">
              {item.quantity}
            </p>
            <p className="min-w-[6rem] text-right text-sm tabular-nums text-ink-muted">
              {item.unitPrice}
            </p>
            <p className="min-w-[4rem] text-right text-sm font-medium tabular-nums text-ink">
              {item.cost}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between border-t border-line-strong pt-3">
        <span className="text-sm font-semibold text-ink">Estimated material total</span>
        <span className="text-sm font-semibold tabular-nums text-ink">{pack.costTotal}</span>
      </div>
      <p className="mt-2 text-xs text-ink-subtle">{pack.budgetNote}</p>
      {pack.contractorQuote ? (
        <p className="mt-1 text-xs text-ink-subtle">
          Contractor quote on file: {pack.contractorQuote}.
        </p>
      ) : null}
    </section>
  );
}

function PackScenarios({ pack }: { pack: ProjectPack }) {
  return (
    <section>
      <SectionTitle>Options compared</SectionTitle>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {pack.scenarios.map((scenario) => (
          <div
            key={scenario.name}
            className={`rounded-xl border p-4 ${
              scenario.recommended ? "border-brand/30 bg-brand-soft/50" : "border-line"
            }`}
          >
            <h3 className="text-sm font-semibold text-ink">{scenario.name}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">{scenario.summary}</p>
            <dl className="mt-2 space-y-1">
              {scenario.rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-ink-muted">{row.label}</dt>
                  <dd className="font-medium tabular-nums text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function PackChecklist({ pack }: { pack: ProjectPack }) {
  return (
    <section>
      <SectionTitle>Shopping list</SectionTitle>
      <ul className="mt-2 divide-y divide-line">
        {pack.checklist.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-start gap-3 py-2">
            <span
              aria-hidden
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
                item.checked ? "border-brand bg-brand text-white" : "border-line-strong"
              }`}
            >
              {item.checked ? <Check className="h-3 w-3" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink">
                {item.label}
                {item.optional ? (
                  <span className="ml-1.5 text-xs text-ink-subtle">(optional)</span>
                ) : null}
              </span>
              {item.detail ? (
                <span className="block text-xs tabular-nums text-ink-muted">{item.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PackSteps({ pack }: { pack: ProjectPack }) {
  return (
    <section>
      <SectionTitle>Project sequence</SectionTitle>
      <ol className="mt-2 space-y-2">
        {pack.steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-ink">
            <span className="w-5 shrink-0 text-right font-semibold text-ink-subtle">
              {index + 1}.
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PackWarnings({ pack }: { pack: ProjectPack }) {
  return (
    <section>
      <SectionTitle>Before you start</SectionTitle>
      <ul className="mt-3 space-y-2">
        {pack.warnings.map((warning, index) => (
          <li key={index} className="flex gap-2.5 rounded-lg bg-accent-soft p-3 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span>{warning}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PackNotes({ pack }: { pack: ProjectPack }) {
  return (
    <section>
      <SectionTitle>Notes</SectionTitle>
      <div className="mt-3 min-h-[4rem] whitespace-pre-wrap rounded-xl border border-line p-4 text-sm text-ink-muted">
        {pack.notes || `Add notes on the ${site.name} planner page and they appear here.`}
      </div>
    </section>
  );
}
