import Link from "next/link";
import { ProsePage } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo";
import { features, site } from "@/config/site";

export const metadata = pageMetadata({
  title: "About Cubitora",
  description:
    "Why Cubitora exists, how the calculations work, and what the estimates can and cannot tell you.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <ProsePage
      title={`About ${site.name}`}
      intro={site.tagline}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ]}
    >
      <section>
        <h2>Why this exists</h2>
        <p>
          Most home projects stall in the same place: you know what you want to build, but you have
          no idea what to buy or what it will cost. A calculator gives you a volume. It does not
          tell you that concrete is sold by the quarter yard, that flooring comes in whole boxes, or
          that the form stakes and the expansion joint are the things you will forget.
        </p>
        <p>
          Cubitora starts from the project rather than the equation. You describe what you are
          building, and it works out quantities with a waste allowance, rounds them to what you can
          actually purchase, prices them, builds a shopping list, and lays out the order of
          operations. Then it hands you a document you can print or take to the store.
        </p>
      </section>

      <section>
        <h2>How the numbers are produced</h2>
        <p>
          Every number comes from plain, tested arithmetic in the application — not from a language
          model. The calculations are unit-tested, including the packaging and rounding rules, and
          each result page shows the exact formulas used alongside the planning assumptions applied.
        </p>
        <p>
          Where the answer depends on a convention rather than a measurement — a waste percentage, a
          bag yield, a coverage rate — that assumption is shown to you and can be changed. Prices
          are national ballpark planning figures you can overwrite with your own; they are not live
          retail prices and Cubitora does not claim they are.
        </p>
        <p>
          AI is used in one place only: reading your plain-English description and proposing which
          planner to open and which measurements you mentioned. It never calculates anything, and
          you see and can correct every value before it is used.
        </p>
      </section>

      <section>
        <h2>What Cubitora is not</h2>
        <ul>
          <li>It is not structural engineering. Spans, footings, loads, and code compliance are outside what a material estimator can responsibly answer.</li>
          <li>It is not a quote. Material costs vary by region, supplier, season, and grade.</li>
          <li>It is not a substitute for your local building department. Permits and code requirements differ everywhere.</li>
          <li>It is not a contractor marketplace, and it does not sell your details to one.</li>
        </ul>
      </section>

      {features.beta ? (
        <section>
          <h2>Cubitora is in beta</h2>
          <p>
            The site works and the estimates are tested, but the planning assumptions behind them —
            coverage rates, waste allowances, package sizes — are still being checked against real
            projects and real receipts. Where we found one wrong, we fixed it and wrote down where
            the corrected figure came from.
          </p>
          <p>
            So treat the numbers as a well-researched starting point rather than a final answer, and
            do what you would do anyway: check the critical ones against the product you actually
            buy. If something looks off, the &ldquo;Does this estimate look wrong?&rdquo; link under
            every result is the fastest way to tell us, and it is read.
          </p>
        </section>
      ) : null}

      <section>
        <h2>Privacy in one paragraph</h2>
        <p>
          There are no accounts. Your projects are saved in your own browser, not on a server. See
          the <Link href="/privacy">privacy policy</Link> for the full picture.
        </p>
      </section>

      <section>
        <h2>Get in touch</h2>
        <p>
          Found a calculation that looks wrong, or a project we should add?{" "}
          <Link href="/contact">Tell us</Link> — calculation correctness is the thing we care about
          most.
        </p>
      </section>
    </ProsePage>
  );
}
