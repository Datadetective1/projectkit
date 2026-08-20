import Link from "next/link";
import { LegalReviewNote, ProsePage } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo";
import { features, formatPackPrice, legal, site } from "@/config/site";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description:
    "The terms covering Cubitora's planning estimates, Project Pack purchases, and limits of liability.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <ProsePage
      title="Terms of use"
      intro="Cubitora gives you planning estimates. You decide what to build and what to buy."
      updated={legal.lastUpdated}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Terms", path: "/terms" },
      ]}
    >
      <LegalReviewNote>
        These are plain-language starter terms for a planning utility. Liability limits, warranty
        disclaimers, consumer-rights carve-outs, refund obligations, and governing-law clauses vary
        by jurisdiction and must be reviewed by a qualified lawyer before you rely on them.
      </LegalReviewNote>

      <section>
        <h2>1. Estimates, not specifications</h2>
        <p>{legal.planningDisclaimer}</p>
        <p>
          Every quantity, cost, and material list Cubitora produces is a planning estimate derived
          from the values you enter and the assumptions shown on the page. Actual requirements
          depend on site conditions, materials, workmanship, local code, and factors Cubitora
          cannot observe.
        </p>
      </section>

      <section>
        <h2>2. What we do not claim</h2>
        <p>Cubitora does not represent that any output is:</p>
        <ul>
          <li>a guaranteed material quantity;</li>
          <li>a guaranteed or quoted price;</li>
          <li>structurally adequate or safe for any particular use;</li>
          <li>compliant with any building code, ordinance, or permit requirement;</li>
          <li>approved or verified by any contractor, engineer, supplier, or authority.</li>
        </ul>
        <p>
          Structural design — including spans, beam and joist sizing, footing depth, post spacing,
          and ledger attachment — is outside the scope of this tool. Have structural work designed
          or verified by a qualified professional and reviewed by your local building department.
        </p>
      </section>

      <section>
        <h2>3. Verify before you buy or build</h2>
        <p>
          Confirm quantities with your supplier, product specifications with the manufacturer, and
          requirements with your local building department before purchasing materials or starting
          work. Where a figure is labelled an estimate or an assumption on the page, treat it as a
          starting point rather than an answer.
        </p>
      </section>

      <section>
        <h2>4. Prices shown in the app</h2>
        <p>
          Default prices are national ballpark planning figures, not live retail prices, and they
          are editable. Cost totals are calculated from whichever prices are in the form at the
          time. Cubitora does not track, quote, or guarantee any retailer&apos;s pricing or
          availability.
        </p>
      </section>

      <section>
        <h2>5. Your saved projects</h2>
        <p>
          Saved projects are stored in your browser, not on our servers. We cannot recover them if
          you clear your browser data, and they do not transfer between devices or browsers. Keep a
          printed or downloaded copy of anything you need to keep. See the{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </section>

      <section>
        <h2>6. The Project Pack</h2>
        {/*
          Kept truthful against the deployment rather than describing a purchase
          flow nobody is currently in. Saying "currently $6.99" while the pack is
          free during beta is the kind of small inaccuracy that makes a reader
          doubt the rest of the page.
        */}
        {features.projectPackFree ? (
          <>
            <p>
              The Project Pack is <strong>free during the beta</strong>. No payment is taken and no
              card details are collected. We intend to charge for it later; if that changes, the
              price will be shown before anything is bought and this page will be updated first.
            </p>
            <p>
              Because there are no accounts, a pack is unlocked in the browser you are using.
              Clearing that browser&apos;s data may remove the unlock.
            </p>
          </>
        ) : (
          <>
            <p>
              The Project Pack is a one-time purchase, currently {formatPackPrice()}, that unlocks
              the downloadable PDF of a project plan in the browser where you bought it. Because it
              is a digital product delivered immediately, and because the pack contents are visible
              on screen before purchase, it is generally non-refundable — but if it does not work,
              contact us and we will make it right.
            </p>
            <p>
              Payments are processed by Stripe under Stripe&apos;s terms. We never receive or store
              card details. Because there are no accounts, an unlock is recorded in the browser used
              for the purchase; clearing that browser&apos;s data may remove it.
            </p>
          </>
        )}
      </section>

      <section>
        <h2>7. Acceptable use</h2>
        <p>
          Use Cubitora for planning your own projects, or projects you are working on for others.
          Do not attempt to disrupt the service, scrape it at scale, or present its output as a
          professional certification, engineered design, or formal quotation.
        </p>
      </section>

      <section>
        <h2>8. Advertising and affiliate links</h2>
        <p>
          Cubitora may display advertising and may earn a commission on purchases made through
          links marked as affiliate links. This does not change what the calculators tell you, and
          no retailer pays for placement in a result.
        </p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p>
          Cubitora is provided &ldquo;as is&rdquo;, without warranties of any kind to the fullest
          extent permitted by law. To that same extent, Cubitora is not liable for any loss or
          damage arising from use of the service — including over-ordering, under-ordering, cost
          overruns, project delays, rework, property damage, or injury. You are responsible for the
          decisions you make and the work you carry out.
        </p>
        <p>
          Nothing in these terms limits liability that cannot lawfully be limited, including
          liability for death or personal injury caused by negligence, or for fraud.
        </p>
      </section>

      <section>
        <h2>10. Changes</h2>
        <p>
          These terms may change as the product develops. The date at the top of this page shows
          when they were last updated; continuing to use Cubitora means the current terms apply.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
      </section>
    </ProsePage>
  );
}
