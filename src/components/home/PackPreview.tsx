import { Download, FileText, Printer } from "lucide-react";

/**
 * A representation of the Project Pack, for the homepage.
 *
 * The pack is the strongest thing the product makes and it was previously
 * described in a sentence and never shown. This is a document mock, not a
 * screenshot: it names the sections a real pack contains, in the order it
 * contains them, so the promise is concrete without pretending to be a live
 * render.
 *
 * Static and server-rendered — the section names are real text for crawlers,
 * and there is no JavaScript or layout shift attached to it.
 */

const SECTIONS = [
  "Project summary",
  "Materials & budget",
  "Shopping list",
  "Project sequence",
  "Assumptions used",
  "How it was calculated",
];

export function PackPreview() {
  return (
    <div className="relative">
      {/*
        Two offset edges behind the card suggest a multi-page document without
        resorting to a skeuomorphic paper stack. Hidden from assistive tech —
        they carry no meaning.
      */}
      <div
        aria-hidden
        className="absolute inset-x-3 -bottom-2 h-8 rounded-b-[var(--radius-card)] border border-line bg-surface-sunken/70"
      />
      <div
        aria-hidden
        className="absolute inset-x-1.5 -bottom-1 h-8 rounded-b-[var(--radius-card)] border border-line bg-surface"
      />

      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand" aria-hidden />
            <p className="text-sm font-semibold text-ink">Cubitora Project Pack</p>
          </div>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-ink">
            Free in beta
          </span>
        </div>

        <div className="px-5 pb-1 pt-4">
          <p className="text-lg font-semibold tracking-tight text-ink">Concrete — 20 × 16 ft</p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Outdoor &amp; Structural · Challenging · A full weekend with help
          </p>
        </div>

        <ul className="mt-3 divide-y divide-line border-y border-line">
          {SECTIONS.map((section) => (
            <li key={section} className="flex items-center gap-2.5 px-5 py-2.5">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" />
              <span className="text-sm text-ink">{section}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 px-5 py-4">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted">
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Print
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download PDF
          </span>
        </div>
      </div>
    </div>
  );
}
