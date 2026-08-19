import { features, site } from "@/config/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
          <path
            d="M4 19V8.5L12 4l8 4.5V19"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 19v-5h6v5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[1.0625rem] font-semibold tracking-tight text-ink">
        {site.name}
      </span>
      {/*
        Expectation-setting, not a warning. The estimates are validated and the
        site is stable; what "beta" says here is that the numbers are still
        being checked against real projects and that feedback changes them.
      */}
      {features.beta ? (
        <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-subtle">
          Beta
        </span>
      ) : null}
    </span>
  );
}
