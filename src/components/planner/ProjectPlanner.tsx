"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Save,
  Share2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { InputField } from "./InputField";
import { UnitToggle } from "./UnitToggle";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { ShoppingList, buildShoppingList } from "@/components/results/ShoppingList";
import { ProjectSequence } from "@/components/results/ProjectSequence";
import { DiyOrHire } from "@/components/results/DiyOrHire";
import { WhatIf } from "@/components/results/WhatIf";
import { AdSlot } from "@/components/monetization/AdSlot";
import { ReportProblem } from "@/components/ReportProblem";
import {
  anchorsFor,
  applyPrefill,
  convertValues,
  defaultValues,
  evaluate,
  toQueryParams,
  validate,
  visibleInputs,
  type CanonicalAnchors,
} from "@/lib/calc/engine";
import { getProject } from "@/data/projects";
import { track } from "@/lib/analytics";
import { formatCurrency, roundTo, toCanonical, type UnitSystem } from "@/lib/units";
import { buildTextSummary } from "@/lib/summary";
import { legal } from "@/config/site";
import {
  getSavedProject,
  saveProject,
  type SavedProject,
} from "@/lib/storage/savedProjects";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { InputValue, InputValues, ProjectDefinition } from "@/types/project";

type Status = { kind: "idle" } | { kind: "saved"; id: string } | { kind: "error"; message: string };

export function ProjectPlanner({ slug }: { slug: string }) {
  const project = getProject(slug);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Everything the URL and local storage determine is resolved once, lazily,
  // rather than assigned from an effect — the form never renders with defaults
  // it is about to replace.
  const initial = useState(() => resolveInitialState(project, searchParams))[0];

  const [system, setSystem] = useState<UnitSystem>(initial.system);
  const [values, setValues] = useState<InputValues>(initial.values);
  const [showAdvanced, setShowAdvanced] = useState(initial.showAdvanced);
  const [savedId, setSavedId] = useState<string | undefined>(initial.savedId);
  const [notes, setNotes] = useState(initial.notes);
  const [checked, setChecked] = useState<string[]>(initial.checked);
  const [contractorQuote, setContractorQuote] = useState<number | "">(initial.contractorQuote);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  // Bumped by Calculate so the headline replays its settle after the scroll.
  const [revealKey, setRevealKey] = useState(0);

  const prefilled = initial.prefilled;
  const fromNaturalLanguage = initial.fromNaturalLanguage;

  const resultsRef = useRef<HTMLDivElement>(null);

  // Remembers the exact value behind each field so flipping units repeatedly
  // returns to the number the user typed, not a drifting approximation.
  const anchors = useRef<CanonicalAnchors>(
    project ? anchorsFor(project, initial.values, initial.system) : {},
  );

  useEffect(() => {
    if (initial.prefilled.length > 0) {
      track("project_started", { projectType: slug, prefilled: initial.prefilled.length });
    }
  }, [initial.prefilled.length, slug]);

  const handleChange = useCallback(
    (id: string, value: InputValue) => {
      // Anchors are stored canonically, so they stay valid across unit switches.
      const input = project?.inputs.find((item) => item.id === id);
      if (input?.type === "number") {
        const numeric = typeof value === "number" ? value : Number(value);
        if (value !== "" && Number.isFinite(numeric)) {
          anchors.current[id] = toCanonical(numeric, input.measure, system);
        } else {
          delete anchors.current[id];
        }
      }
      setValues((current) => ({ ...current, [id]: value }));
      setStatus({ kind: "idle" });
    },
    [project, system],
  );

  const handleSystemChange = useCallback(
    (next: UnitSystem) => {
      if (!project || next === system) return;
      setValues((current) => convertValues(project, current, system, next, anchors.current));
      setSystem(next);
      track("units_changed", { projectType: project.slug, system: next });
    },
    [project, system],
  );

  const evaluation = useMemo(() => {
    if (!project) return undefined;
    return evaluate(project, values, system);
  }, [project, values, system]);

  const errors = useMemo(() => {
    if (!project) return {};
    return validate(project, values, system);
  }, [project, values, system]);

  const shoppingEntries = useMemo(() => {
    if (!evaluation?.ok) return [];
    return buildShoppingList(evaluation.result, system);
  }, [evaluation, system]);

  if (!project) {
    return (
      <div className="pk-card p-6">
        <p className="text-ink">That planner does not exist.</p>
        <Link href="/projects" className="pk-btn pk-btn-secondary mt-4">
          Browse all planners
        </Link>
      </div>
    );
  }

  const visible = visibleInputs(project, values);
  const quickInputs = visible.filter((input) => input.tier === "quick");
  const advancedInputs = visible.filter((input) => input.tier === "advanced");
  const advancedGroups = Array.from(
    new Set(advancedInputs.map((input) => input.group ?? "Options")),
  );

  const hasErrors = Object.keys(errors).length > 0;

  const handleCalculate = () => {
    if (!evaluation?.ok) return;
    track("project_completed", {
      projectType: project.slug,
      mode: showAdvanced ? "advanced" : "quick",
      system,
    });
    track("result_viewed", { projectType: project.slug });
    setRevealKey((current) => current + 1);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = () => {
    if (!evaluation?.ok) return;
    const saved: SavedProject | undefined = saveProject({
      id: savedId,
      slug: project.slug,
      title: buildTitle(project, values, system),
      unitSystem: system,
      values,
      notes,
      checked,
      contractorQuote: typeof contractorQuote === "number" ? contractorQuote : undefined,
    });

    if (!saved) {
      setStatus({
        kind: "error",
        message:
          "Could not save — your browser is blocking local storage. Private browsing often does this.",
      });
      return;
    }
    setSavedId(saved.id);
    setStatus({ kind: "saved", id: saved.id });
    track("project_saved", { projectType: project.slug });
  };

  /** A link that reproduces exactly these inputs. Carries no personal data. */
  const shareUrl = () => {
    const params = toQueryParams(project, values, system);
    return `${window.location.origin}/${project.slug}${params.toString() ? `?${params}` : ""}`;
  };

  const flashCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleCopySummary = async () => {
    if (!evaluation?.ok) return;
    const text = buildTextSummary({
      projectName: project.name,
      result: evaluation.result,
      system,
      url: shareUrl(),
    });

    try {
      await navigator.clipboard.writeText(text);
      flashCopied();
      track("project_shared", { projectType: project.slug, method: "copy_summary" });
    } catch {
      setStatus({
        kind: "error",
        message: "Your browser blocked the clipboard. Print the page or use the Project Pack instead.",
      });
    }
  };

  const handleShare = async () => {
    const url = shareUrl();
    const summary = evaluation?.ok
      ? `${project.name} plan — ${evaluation.result.headline.sublabel ?? ""}\n${url}`
      : url;

    try {
      if (navigator.share) {
        await navigator.share({ title: `${project.name} plan`, text: summary, url });
        track("project_shared", { projectType: project.slug, method: "web_share" });
        return;
      }
    } catch {
      // User dismissed the share sheet, or it is unavailable — fall back to copy.
    }

    try {
      await navigator.clipboard.writeText(summary);
      flashCopied();
      track("project_shared", { projectType: project.slug, method: "clipboard" });
    } catch {
      setStatus({ kind: "error", message: "Could not copy the link. You can copy it from the address bar." });
    }
  };

  const handlePackClick = () => {
    if (!evaluation?.ok) return;
    track("project_pack_previewed", { projectType: project.slug });
    const saved = saveProject({
      id: savedId,
      slug: project.slug,
      title: buildTitle(project, values, system),
      unitSystem: system,
      values,
      notes,
      checked,
      contractorQuote: typeof contractorQuote === "number" ? contractorQuote : undefined,
    });
    if (!saved) {
      setStatus({
        kind: "error",
        message: "The Project Pack needs local storage, which your browser is blocking.",
      });
      return;
    }
    setSavedId(saved.id);
    router.push(`/project-pack/${saved.id}`);
  };

  // grid-cols-1 (rather than the implicit auto column) keeps a wide child — the
  // materials table — from stretching the whole layout on small screens.
  return (
    <div className="pk-print-flow grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      {/* --------------------------------------------------------- inputs -- */}
      {/*
        The form is omitted from print: its values are restated in the project
        summary, and empty input boxes on paper help nobody.
      */}
      <form
        className="pk-card pk-no-print p-5 sm:p-6 lg:sticky lg:top-20"
        onSubmit={(event) => {
          event.preventDefault();
          handleCalculate();
        }}
      >
        {fromNaturalLanguage && prefilled.length > 0 ? (
          <div className="mb-5 flex gap-3 rounded-xl bg-brand-soft p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
            <p className="text-sm text-brand-ink">
              We read your description as a {project.name.toLowerCase()} project and filled in{" "}
              {prefilled.length} {prefilled.length === 1 ? "detail" : "details"}. Check them before
              you buy anything.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Your project</h2>
          <UnitToggle value={system} onChange={handleSystemChange} />
        </div>

        <div className="mt-5 grid gap-4">
          {quickInputs.map((input) => (
            <InputField
              key={input.id}
              input={input}
              values={values}
              system={system}
              error={errors[input.id]}
              onChange={handleChange}
            />
          ))}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-options"
            className="pk-btn pk-btn-ghost -ml-3"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {showAdvanced ? "Hide options" : "Customize estimate"}
          </button>

          {showAdvanced ? (
            <div id="advanced-options" className="mt-4 grid gap-6">
              {advancedGroups.map((group) => (
                <fieldset key={group}>
                  <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                    {group}
                  </legend>
                  <div className="grid gap-4">
                    {advancedInputs
                      .filter((input) => (input.group ?? "Options") === group)
                      .map((input) => (
                        <InputField
                          key={input.id}
                          input={input}
                          values={values}
                          system={system}
                          error={errors[input.id]}
                          onChange={handleChange}
                        />
                      ))}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}
        </div>

        <button type="submit" className="pk-btn pk-btn-primary mt-6 w-full" disabled={hasErrors}>
          Calculate my project
        </button>

        {hasErrors ? (
          <p role="status" className="mt-3 text-sm text-danger">
            Fix the highlighted fields to see your estimate.
          </p>
        ) : null}

        <p className="mt-4 text-xs text-ink-subtle">{legal.shortDisclaimer}</p>
      </form>

      {/* -------------------------------------------------------- results -- */}
      <div ref={resultsRef} className="flex flex-col gap-6 scroll-mt-24">
        {evaluation?.ok ? (
          <>
            <ResultsPanel
              result={evaluation.result}
              system={system}
              projectName={project.name}
              projectType={project.slug}
              revealKey={revealKey}
            />

            <WhatIf
              def={project}
              values={values}
              system={system}
              costTotal={evaluation.result.costTotal}
              onChange={handleChange}
            />

            <AdSlot placement="result-below-summary" />

            <section className="pk-card pk-no-print p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-ink">Save, share, and take it with you</h2>
              <p className="mt-1 text-sm text-ink-muted">
                No account needed. Saved projects stay in this browser.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={handleSave} className="pk-btn pk-btn-secondary">
                  <Save className="h-4 w-4" aria-hidden />
                  {savedId ? "Update saved project" : "Save this project"}
                </button>
                <button type="button" onClick={handleShare} className="pk-btn pk-btn-secondary">
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <Share2 className="h-4 w-4" aria-hidden />
                  )}
                  {copied ? "Copied" : "Share"}
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="pk-btn pk-btn-secondary"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy summary
                </button>
                <button type="button" onClick={handlePackClick} className="pk-btn pk-btn-primary">
                  <FileText className="h-4 w-4" aria-hidden />
                  Preview Project Pack
                </button>
              </div>

              <div className="mt-5">
                <label htmlFor="project-notes" className="block text-sm font-medium text-ink">
                  Notes
                </label>
                <textarea
                  id="project-notes"
                  rows={3}
                  className="pk-field mt-1.5 resize-y"
                  placeholder="Colour, supplier, delivery date, anything you want on the printout."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              <div aria-live="polite" className="mt-3 min-h-[1.25rem]">
                {status.kind === "saved" ? (
                  <p className="flex items-center gap-2 text-sm text-brand-ink">
                    <Check className="h-4 w-4" aria-hidden />
                    Saved.{" "}
                    <Link href="/my-projects" className="underline underline-offset-4">
                      View my projects
                    </Link>
                  </p>
                ) : null}
                {status.kind === "error" ? (
                  <p className="text-sm text-danger">{status.message}</p>
                ) : null}
                {copied ? (
                  <p className="flex items-center gap-2 text-sm text-brand-ink">
                    <Copy className="h-4 w-4" aria-hidden />
                    Summary and link copied.
                  </p>
                ) : null}
              </div>
            </section>

            <ShoppingList
              title={`${project.name} shopping list`}
              entries={shoppingEntries}
              checked={checked}
              onToggle={(id, next) => {
                setChecked((current) =>
                  next ? [...current, id] : current.filter((item) => item !== id),
                );
                track("shopping_list_item_toggled", { projectType: project.slug, checked: next });
              }}
            />

            <ProjectSequence steps={project.steps} />

            <DiyOrHire
              result={evaluation.result}
              quote={contractorQuote}
              onQuoteChange={setContractorQuote}
            />

            <ProjectPackTeaser
              onClick={handlePackClick}
              costTotal={evaluation.result.costTotal}
            />

            {/*
              Under the result, because that is where someone realises a number
              looks wrong. Sends the planner, the unit system, and the build —
              never the dimensions or the notes.
            */}
            <ReportProblem
              projectType={project.slug}
              system={system}
              className="justify-center pk-no-print"
            />
          </>
        ) : (
          <div className="pk-card p-6">
            <h2 className="text-lg font-semibold text-ink">Your estimate will appear here</h2>
            <p className="pk-prose mt-2 text-sm">
              {evaluation && !evaluation.ok && evaluation.message
                ? evaluation.message
                : "Fill in the project details on the left and we will work out quantities, cost, and a shopping list."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectPackTeaser({
  onClick,
  costTotal,
}: {
  onClick: () => void;
  costTotal: number;
}) {
  return (
    <section className="pk-no-print rounded-[var(--radius-card)] border border-brand/20 bg-brand-soft p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-brand-ink">Take the whole plan with you</h2>
      <p className="mt-2 max-w-prose text-sm text-brand-ink/85">
        The Project Pack collects your quantities, the {formatCurrency(costTotal)} budget, the
        shopping list, your assumptions, and the project sequence into one printable document —
        good enough to hand to a store associate or a contractor.
      </p>
      <button type="button" onClick={onClick} className="pk-btn pk-btn-primary mt-4">
        <FileText className="h-4 w-4" aria-hidden />
        Preview Project Pack
      </button>
    </section>
  );
}

/**
 * A saved project's name. Dimensions read better in a list than a headline
 * figure does — "Concrete — 20 × 16 ft" beats "Concrete — 4.50 yd³".
 */
function buildTitle(
  project: ProjectDefinition,
  values: InputValues,
  system: UnitSystem,
): string {
  const unit = system === "us" ? "ft" : "m";
  const dimension = (id: string) => {
    const raw = values[id];
    const numeric = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
    // A 20 ft slab converts to 6.096 m, and "Concrete — 6.096 × 4.8768 m" is a
    // conversion artefact, not a project name. Two decimals is as much as any
    // of these dimensions means. roundTo drops trailing zeros, so a US 20 stays
    // "20" rather than becoming "20.00".
    return roundTo(numeric, 2);
  };

  const length = dimension("length") ?? dimension("length1") ?? dimension("runLength");
  const width = dimension("width") ?? dimension("width1");

  if (length && width) return `${project.name} — ${length} × ${width} ${unit}`;
  if (length) return `${project.name} — ${length} ${unit}`;

  const area = dimension("area") ?? dimension("extraArea");
  if (area) return `${project.name} — ${area} ${system === "us" ? "sq ft" : "m²"}`;

  return `${project.name} project`;
}

interface InitialState {
  system: UnitSystem;
  values: InputValues;
  showAdvanced: boolean;
  savedId?: string;
  notes: string;
  checked: string[];
  contractorQuote: number | "";
  prefilled: string[];
  fromNaturalLanguage: boolean;
}

/**
 * Resolve the planner's opening state from a saved project (`?saved=`) or from
 * prefill parameters, falling back to the project's defaults.
 */
function resolveInitialState(
  project: ProjectDefinition | undefined,
  searchParams: ReadonlyURLSearchParams,
): InitialState {
  const empty: InitialState = {
    system: "us",
    values: {},
    showAdvanced: false,
    notes: "",
    checked: [],
    contractorQuote: "",
    prefilled: [],
    fromNaturalLanguage: false,
  };
  if (!project) return empty;

  const params = Object.fromEntries(searchParams.entries());

  if (params.saved) {
    const saved = getSavedProject(params.saved);
    if (saved && saved.slug === project.slug) {
      return {
        system: saved.unitSystem,
        values: { ...defaultValues(project, saved.unitSystem), ...saved.values },
        showAdvanced: true,
        savedId: saved.id,
        notes: saved.notes,
        checked: saved.checked,
        contractorQuote: saved.contractorQuote ?? "",
        prefilled: [],
        fromNaturalLanguage: false,
      };
    }
  }

  const system: UnitSystem = params.units === "metric" ? "metric" : "us";
  const { values, applied } = applyPrefill(project, defaultValues(project, system), params);
  const touchedAdvanced = applied.some(
    (id) => project.inputs.find((input) => input.id === id)?.tier === "advanced",
  );

  return {
    ...empty,
    system,
    values,
    showAdvanced: touchedAdvanced,
    prefilled: applied,
    fromNaturalLanguage: params.from === "nl",
  };
}
