import { Breadcrumbs } from "./Breadcrumbs";
import type { Crumb } from "@/lib/seo";

/** Shared layout for the plain-text pages: about, contact, privacy, terms. */
export function ProsePage({
  title,
  intro,
  crumbs,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  crumbs: Crumb[];
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Breadcrumbs crumbs={crumbs} />

      <header className="mt-5">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {intro ? <p className="pk-prose mt-3 text-base">{intro}</p> : null}
        {updated ? (
          <p className="mt-3 text-xs text-ink-subtle">Last updated {updated}</p>
        ) : null}
      </header>

      <div
        className="mt-8 space-y-8 [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_li]:text-[0.9375rem] [&_li]:leading-relaxed [&_li]:text-ink-muted [&_p]:mt-3 [&_p]:text-[0.9375rem] [&_p]:leading-relaxed [&_p]:text-ink-muted [&_ul]:mt-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:[list-style:disc]"
      >
        {children}
      </div>
    </div>
  );
}

/** Highlights something a lawyer needs to look at before launch. */
export function LegalReviewNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-accent/30 bg-accent-soft p-3 text-sm text-ink">
      <strong className="font-semibold">Needs legal review before launch:</strong> {children}
    </p>
  );
}
