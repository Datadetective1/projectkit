import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Crumb } from "@/lib/seo";

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pk-no-print">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
              ) : null}
              {isLast ? (
                <span aria-current="page" className="font-medium text-ink">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className="underline-offset-4 hover:text-ink hover:underline">
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
