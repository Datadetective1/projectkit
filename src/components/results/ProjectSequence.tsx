export function ProjectSequence({ steps }: { steps: string[] }) {
  return (
    <section aria-labelledby="project-sequence" className="pk-card p-5 sm:p-6">
      <h2 id="project-sequence" className="text-lg font-semibold text-ink">
        Project sequence
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        A planning-level order of operations, not installation instructions.
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-muted"
            >
              {index + 1}
            </span>
            <span className="text-sm leading-relaxed text-ink">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
