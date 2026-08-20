import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnswerShell } from "@/components/answers/AnswerShell";
import { SizeAnswer } from "@/components/answers/SizeAnswer";
import { ComparisonAnswer } from "@/components/answers/ComparisonAnswer";
import { ConversionAnswer } from "@/components/answers/ConversionAnswer";
import { CoverageAnswer } from "@/components/answers/CoverageAnswer";
import { JsonLd } from "@/components/ui/JsonLd";
import { answerPages, getAnswer } from "@/data/answers";
import { getProject } from "@/data/projects";
import { compute, threeNumbers } from "@/lib/answers/compute";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, webApplicationJsonLd } from "@/lib/seo";

/**
 * Answer pages, nested under the planner they belong to.
 *
 * Static at build time, like the planners: every page runs the real calculation
 * once during the build and ships plain HTML, so the answer is in the markup
 * for a crawler, an answer engine, and anyone with JavaScript switched off.
 * Nothing here is computed in the browser.
 *
 * Anything that is not a declared answer 404s. The route is nested inside the
 * `[slug]` planner segment, so without that check `/concrete-calculator/wharever`
 * would render.
 */
export function generateStaticParams() {
  return answerPages.map((page) => ({ slug: page.planner, topic: page.slug }));
}

/** No answer page is generated on demand; the five above are the whole set. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; topic: string }>;
}): Promise<Metadata> {
  const { slug, topic } = await params;
  const answer = getAnswer(slug, topic);
  if (!answer) return {};

  return pageMetadata({
    title: answer.seo.title,
    description: answer.seo.description,
    path: `/${answer.planner}/${answer.slug}`,
  });
}

export default async function AnswerRoute({
  params,
}: {
  params: Promise<{ slug: string; topic: string }>;
}) {
  const { slug, topic } = await params;
  const answer = getAnswer(slug, topic);
  if (!answer) notFound();

  const project = getProject(answer.planner);
  if (!project) notFound();

  const computed = compute(answer.planner, answer.values);
  if (!computed) notFound();

  const numbers = threeNumbers(computed);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.seo.breadcrumb, path: `/${project.slug}` },
    { name: answer.seo.breadcrumb, path: `/${project.slug}/${answer.slug}` },
  ];

  /*
   * The one-line answer, assembled from computed values rather than written.
   * It is the sentence a search result or an answer engine is most likely to
   * lift, so it has to be true without the rest of the page around it.
   */
  const answerLine = answerLineFor(answer.kind, {
    purchase: numbers.purchase,
    withWaste: numbers.withWaste,
    projectName: project.name.toLowerCase(),
  });

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          webApplicationJsonLd({
            name: `${project.name} calculator — ${answer.seo.breadcrumb}`,
            description: answer.seo.description,
            path: `/${project.slug}/${answer.slug}`,
          }),
          ...(answer.faq.length > 0 ? [faqJsonLd(answer.faq)] : []),
        ]}
      />

      <AnswerShell answer={answer} project={project} computed={computed} answerLine={answerLine}>
        {answer.kind === "size" ? (
          <SizeAnswer answer={answer} project={project} computed={computed} />
        ) : null}
        {answer.kind === "comparison" ? (
          <ComparisonAnswer project={project} computed={computed} />
        ) : null}
        {answer.kind === "conversion" ? (
          <ConversionAnswer project={project} computed={computed} />
        ) : null}
        {answer.kind === "coverage" ? (
          <CoverageAnswer project={project} computed={computed} />
        ) : null}
      </AnswerShell>
    </>
  );
}

function answerLineFor(
  kind: "size" | "comparison" | "conversion" | "coverage",
  values: { purchase: string | null; withWaste: string; projectName: string },
) {
  const order = values.purchase ?? values.withWaste;

  switch (kind) {
    case "size":
      return (
        <>
          Order <strong className="font-semibold">{order}</strong> — that is {values.withWaste} once
          waste is added, rounded up to what a supplier will sell.
        </>
      );
    case "coverage":
      return (
        <>
          Order <strong className="font-semibold">{order}</strong>, including the allowance for
          cuts. How you buy it matters more than how much.
        </>
      );
    case "comparison":
      return (
        <>
          Ready-mix is the cheaper <em>material</em> at every slab size below. Bags win under about
          a cubic yard — on practicality, not price.
        </>
      );
    case "conversion":
      return (
        <>
          <strong className="font-semibold">13.5 bags</strong> at the common 2 cu ft size — but the
          number moves with the bag, so check which one you are buying.
        </>
      );
  }
}
