import { SavedProjectList } from "@/components/SavedProjectList";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "My Projects",
  description: "Your saved ProjectKit plans, stored in this browser.",
  path: "/my-projects",
  index: false,
});

export default function MyProjectsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "My projects", path: "/my-projects" },
        ]}
      />

      <header className="mt-5 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">My projects</h1>
        <p className="pk-prose mt-3">
          Saved projects live in this browser — no account, no server. Clearing your browser data
          removes them, and they will not follow you to another device.
        </p>
      </header>

      <div className="mt-8">
        <SavedProjectList />
      </div>
    </div>
  );
}
