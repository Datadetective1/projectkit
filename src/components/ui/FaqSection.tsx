import type { FaqItem } from "@/types/project";

export function FaqSection({
  items,
  heading = "Common questions",
}: {
  items: FaqItem[];
  heading?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight text-ink">
        {heading}
      </h2>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <h3 className="text-base font-medium text-ink">{item.question}</h3>
              <span
                aria-hidden
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-strong text-ink-muted transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pk-prose mt-3 max-w-prose text-sm">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
