import type { FaqItem, InputValues } from "@/types/project";

/**
 * An answer page: one specific question, answered by the engine.
 *
 * These exist because the ten planners answer "work out my project" but nobody
 * searches that. People search "how much concrete for a 10x10 slab" — a
 * question the engine can already answer exactly, at a URL that did not exist.
 *
 * The rule that keeps this from becoming content farming: **an answer page
 * carries no numbers of its own.** Every quantity, price and assumption on the
 * page is produced by running the same deterministic calculation the planner
 * runs, at the inputs declared here, on the server. A definition may set the
 * question and the framing; it may not set an answer. If the engine cannot
 * compute it, the page does not claim it.
 */
export interface AnswerPage {
  /** Second path segment: /concrete-calculator/<slug>. */
  slug: string;
  /** The planner this page belongs to and feeds into. */
  planner: string;
  /**
   * Which shape of answer this is. Not decoration — each kind renders a
   * genuinely different page, because "how much for a 10x10 slab", "ready-mix
   * or bags?" and "how many bags in a yard?" are different questions and a
   * single template flattened into all four is exactly the sameness that
   * makes programmatic pages worthless. Sod gets its own kind rather than
   * borrowing the slab layout, because its decision is pallet overshoot and a
   * slab has no equivalent.
   */
  kind: "size" | "comparison" | "conversion" | "coverage";

  /** The page heading, written the way the question is asked. */
  h1: string;
  seo: {
    title: string;
    description: string;
    /** Short label for the breadcrumb trail. */
    breadcrumb: string;
  };

  /**
   * One or two sentences of framing above the answer. Never a number — the
   * engine owns those. This is the only prose written by hand, and it exists so
   * five pages do not open with five identical sentences.
   */
  intro: string;

  /** Engine inputs for this page, merged over the planner's defaults. */
  values: InputValues;

  /**
   * Extra query parameters for the "open the full planner" link, so the planner
   * arrives already set to the numbers the page just discussed.
   */
  prefill: Record<string, string | number>;

  /**
   * Questions genuinely adjacent to this one. Deliberately optional and
   * deliberately short: an FAQ block padded out to hit a word count is the
   * thing that makes a page look automated.
   */
  faq: FaqItem[];

  /** Curated internal links, beyond the automatic parent and sibling links. */
  related: { href: string; label: string; note: string }[];
}
