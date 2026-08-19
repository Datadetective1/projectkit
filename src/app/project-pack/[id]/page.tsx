import { PackPreview } from "@/components/pack/PackPreview";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Your Project Pack",
  description: "A printable plan for your project: quantities, budget, shopping list, and steps.",
  path: "/project-pack",
  index: false,
});

export default async function ProjectPackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <PackPreview id={id} />
    </div>
  );
}
