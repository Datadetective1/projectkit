import Link from "next/link";
import { ProsePage } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/config/site";

export const metadata = pageMetadata({
  title: "Contact",
  description: "How to reach Cubitora about a calculation, a bug, or a project request.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <ProsePage
      title="Contact"
      intro="Corrections are the most useful thing you can send us."
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Contact", path: "/contact" },
      ]}
    >
      <section>
        <h2>Email</h2>
        <p>
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
        </p>
        <p>
          We read everything. We do not have a support queue with hold music, so please allow a few
          days.
        </p>
      </section>

      <section>
        <h2>Reporting a calculation problem</h2>
        <p>
          Calculation correctness is our first priority. If a number looks wrong, the fastest fix
          comes from a report that includes:
        </p>
        <ul>
          <li>Which planner you were using.</li>
          <li>The exact inputs, including the unit system and any assumptions you changed.</li>
          <li>The number Cubitora gave you, and the number you expected.</li>
          <li>Where your expected figure comes from — a supplier, a span table, a product spec sheet.</li>
        </ul>
        <p>
          The share button on any result page copies a link that reproduces your exact inputs.
          Pasting that link tells us everything we need.
        </p>
      </section>

      <section>
        <h2>Requesting a project</h2>
        <p>
          Tell us what you were trying to build and which numbers you needed. Projects with clear,
          well-established material rules are the ones we can add responsibly.
        </p>
      </section>

      <section>
        <h2>What we cannot help with</h2>
        <ul>
          <li>Structural design questions — spans, footings, load paths. Those need a designer or engineer for your specific project and location.</li>
          <li>Local code and permit questions. Your building department is the authority.</li>
          <li>Product-specific installation support. The manufacturer&apos;s instructions govern.</li>
        </ul>
        <p>
          See <Link href="/about">about Cubitora</Link> for where the boundary sits and why.
        </p>
      </section>
    </ProsePage>
  );
}
