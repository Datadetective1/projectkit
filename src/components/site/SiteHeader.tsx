"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { projects } from "@/data/projects";

const primaryLinks = [
  { href: "/projects", label: "All projects" },
  { href: "/my-projects", label: "My projects" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever navigation happens.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="pk-no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="ProjectKit home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-soft text-brand-ink"
                    : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/#plan" className="pk-btn pk-btn-primary ml-2">
            Plan a project
          </Link>
        </nav>

        <button
          type="button"
          className="pk-btn pk-btn-secondary px-3 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-line bg-surface md:hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            <ul className="flex flex-col gap-1">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-surface-sunken"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Planners
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-1">
              {projects.map((project) => (
                <li key={project.slug}>
                  <Link
                    href={`/${project.slug}`}
                    className="block rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
                  >
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
