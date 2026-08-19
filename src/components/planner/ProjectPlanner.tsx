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
import { AdSlot } from "@/components/monetization/AdSlot";
import {
  applyPrefill,
  convertValues,
  defaultValues,
  evaluate,
  toQueryParams,
  validate,
  visibleInputs,
} from "@/lib/calc/engine";
import { getProject } from "@/data/projects";
import { track } from "@/lib/analytics";
import { formatCurrency, type UnitSystem } from "@/lib/units";
import { legal } from "@/config/site";
import {
  getSavedProject,
  saveProject,
  type SavedProject,
} from "@/lib/storage/savedProjects";
import type { InputValue, InputValues } from "@/types/project";

type Status = { kind: "idle" } | { kind: "saved"; id: string } | { kind: "error"; message: string };

export function ProjectPlanner({ slug }: { slug: string }) {
  const project = getProject(slug);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [system, setSystem] = useState<UnitSystem>("us");
  const [values, setValues] = useState<InputValues>(() =>
    project ? defaultValues(project, "us") : {},
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prefilled, setPrefilled] = useState<string[]>([]);
  const [fromNaturalLanguage, setFromNaturalLanguage] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [contractorQuote, setContractorQuote] = useState<number | "">("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);

  /* ------------------------------------------------- initial state setup -- */
  useEffect(() => {
    if (!project || initialised.current) return;
    initialised.current = true;
    setHydrated(true);

    const params = Object.fromEntries(searchParams.entries());
    const savedParam = params.saved;

    if (savedParam) {
      const saved = getSavedProject(savedParam);
      if (saved && saved.slug === project.slug) {
        setSystem(saved.unitSystem);
        setValues({ ...defaultValues(project, saved.unitSystem), ...saved.values });
        setSavedId(saved.id);
        setNotes(saved.notes);
        setChecked(saved.checked);
        setContractorQuote(saved.contractorQuote ?? "");
        setShowAdvanced(true);
        return;
      }
    }

    const requestedSystem: UnitSystem = params.units === "metric" ? "metric" : "us";
    const base = defaultValues(project, requestedSystem);
    const { values: next, applied } = applyPrefill(project, base, params);
    setSystem(requestedSystem);
    setValues(next);
    setPrefilled(applied);
    if (params.from === "nl") setFromNaturalLanguage(true);
    if (applied.some((id) => project.inputs.find((input) => input.id === id)?.tier === "advanced")) {
      setShowAdvanced(true);
    }
    if (applied.length > 0) {
      track("project_started", { slug: project.slug, prefilled: applied.length });
    }
  }, [project, searchParams]);

  const handleChange = useCallback((id: string, value: InputValue) => {
    setValues((current) => ({ ...current, [id]: value }));
    setStatus({ kind: "idle" });
  }, []);

  const handleSystemChange = useCallback(
    (next: UnitSystem) => {
      if (!project || next === system) return;
      setValues((current) => convertValues(project, current, system, next));
      setSystem(next);
      track("units_changed", { slug: project.slug, system: next });
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
    track("project_completed", { slug: project.slug, system });
    track("result_viewed", { slug: project.slug });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = () => {
    if (!evaluation?.ok) return;
    const saved: SavedProject | undefined = saveProject({
      id: savedId,
      slug: project.slug,
      title: buildTitle(project.name, evaluation.result.headline.sublabel),
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
    track("project_saved", { slug: project.slug });
  };

  const handleShare = async () => {
    const params = toQueryParams(project, values, system);
    const url = `${window.location.origin}/${project.slug}${params.toString() ? `?${params}` : ""}`;
    const summary = evaluation?.ok
      ? `${project.name} plan — ${evaluation.result.headline.sublabel ?? ""}\n${url}`
      : url;

    try {
      if (navigator.share) {
        await navigator.share({ title: `${project.name} plan`, text: summary, url });
        track("project_shared", { slug: project.slug, method: "web_share" });
        return;
      }
    } catch {
      // User dismissed the share sheet, or it is unavailable — fall back to copy.
    }

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      track("project_shared", { slug: project.slug, method: "clipboard" });
    } catch {
      setStatus({ kind: "error", message: "Could not copy the link. You can copy it from the address bar." });
    }
  };

  const handlePackClick = () => {
    if (!evaluation?.ok) return;
    track("project_pack_previewed", { slug: project.slug });
    const saved = saveProject({
      id: savedId,
      slug: project.slug,
      title: buildTitle(project.name, evaluation.result.headline.sublabel),
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      {/* --------------------------------------------------------- inputs -- */}
      <form
        className="pk-card p-5 sm:p-6 lg:sticky lg:top-20"
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
            />

            <AdSlot placement="result-below-summary" />

            <section className="pk-card p-5 sm:p-6">
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
                track("shopping_list_item_toggled", { slug: project.slug, checked: next });
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
          </>
        ) : (
          <div className="pk-card p-6">
            <h2 className="text-lg font-semibold text-ink">Your estimate will appear here</h2>
            <p className="pk-prose mt-2 text-sm">
              {hydrated && evaluation && !evaluation.ok && evaluation.message
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
    <section className="rounded-[var(--radius-card)] border border-brand/20 bg-brand-soft p-5 sm:p-6">
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

function buildTitle(projectName: string, sublabel?: string): string {
  if (!sublabel) return `${projectName} project`;
  return `${projectName} — ${sublabel}`.slice(0, 110);
}
