import Link from "next/link";
import { Logo } from "./Logo";
import { projects } from "@/data/projects";
import { legal, site } from "@/config/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="pk-no-print mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="pk-prose mt-3 max-w-xs text-sm">{site.supportingLine}</p>
          </div>

          <nav aria-label="Project planners">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Planners
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {projects.map((project) => (
                <li key={project.slug}>
                  <Link
                    href={`/${project.slug}`}
                    className="text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              ProjectKit
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {[
                { href: "/projects", label: "All projects" },
                { href: "/my-projects", label: "My projects" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="pk-prose max-w-3xl text-xs">{legal.planningDisclaimer}</p>
          <p className="mt-4 text-xs text-ink-subtle">
            © {year} {site.name}. Planning estimates only.
          </p>
        </div>
      </div>
    </footer>
  );
}
