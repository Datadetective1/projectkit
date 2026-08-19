"use client";

import Link from "next/link";
import { FileText, FolderOpen, Trash2 } from "lucide-react";
import { ProjectIcon } from "@/components/ProjectCard";
import { getProject } from "@/data/projects";
import { clearProjects, deleteProject, isStorageAvailable } from "@/lib/storage/savedProjects";
import { useSavedProjects, useStorageReady } from "@/lib/storage/useSavedProjects";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function SavedProjectList() {
  const projects = useSavedProjects();
  // Storage is only readable in the browser, so the server render is a skeleton.
  const ready = useStorageReady();

  if (!ready) {
    // Sized to the empty state, which is what most first visits resolve to.
    // At the old h-40 the card grew by ~110px on hydration and shoved the
    // footer down with it — 0.044 CLS, the whole of this page's score.
    return <div className="pk-card h-[17rem] animate-pulse bg-surface-sunken/50" />;
  }

  if (!isStorageAvailable()) {
    return (
      <div className="pk-card p-6">
        <h2 className="text-lg font-semibold text-ink">Saved projects need local storage</h2>
        <p className="pk-prose mt-2 text-sm">
          Your browser is blocking local storage, which is where ProjectKit keeps saved projects.
          Private browsing windows usually do this. Everything else still works — you just cannot
          save between visits.
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="pk-card p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-surface-sunken text-ink-subtle">
          <FolderOpen className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">No saved projects yet</h2>
        <p className="pk-prose mx-auto mt-2 max-w-sm text-sm">
          Work out a project, hit Save, and it will be waiting here — quantities, shopping list,
          notes, and all.
        </p>
        <Link href="/projects" className="pk-btn pk-btn-primary mt-5">
          Start a project
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
      {projects.map((saved) => {
        const definition = getProject(saved.slug);
        const checkedCount = saved.checked.length;

        return (
          <li key={saved.id} className="pk-card flex flex-col p-5">
            <div className="flex items-start gap-3">
              {definition ? <ProjectIcon project={definition} /> : null}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-ink">{saved.title}</h2>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  {definition?.name ?? saved.slug} · updated{" "}
                  {DATE_FORMAT.format(new Date(saved.updatedAt))}
                  {saved.unitSystem === "metric" ? " · metric" : ""}
                </p>
              </div>
            </div>

            {saved.notes ? (
              <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{saved.notes}</p>
            ) : null}

            {checkedCount > 0 ? (
              <p className="mt-3 text-xs text-ink-subtle">
                {checkedCount} shopping list {checkedCount === 1 ? "item" : "items"} ticked off
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 pt-1">
              <Link
                href={`/${saved.slug}?saved=${saved.id}`}
                className="pk-btn pk-btn-secondary flex-1 sm:flex-none"
              >
                Open
              </Link>
              <Link
                href={`/project-pack/${saved.id}`}
                className="pk-btn pk-btn-secondary flex-1 sm:flex-none"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Pack
              </Link>
              <button
                type="button"
                className="pk-btn pk-btn-secondary px-3 text-danger"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${saved.title}"? This cannot be undone.`,
                    )
                  ) {
                    deleteProject(saved.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                <span className="sr-only">Delete {saved.title}</span>
              </button>
            </div>
          </li>
        );
        })}
      </ul>

      {/*
        Beta testers end up with a drawer full of throwaway projects, and
        deleting them one at a time to reproduce a first-visit bug is tedious.
        Confirmed, and honest that it cannot be undone — this is the only copy
        of the data.
      */}
      <div className="mt-8 border-t border-line pt-5">
        <button
          type="button"
          className="text-xs text-ink-subtle underline-offset-4 hover:text-danger hover:underline"
          onClick={() => {
            const count = projects.length;
            if (
              window.confirm(
                `Delete all ${count} saved ${count === 1 ? "project" : "projects"}? They are stored only in this browser, so this cannot be undone.`,
              )
            ) {
              clearProjects();
            }
          }}
        >
          Clear all saved projects
        </button>
      </div>
    </>
  );
}
