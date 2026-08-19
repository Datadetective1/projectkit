import Link from "next/link";
import { LegalReviewNote, ProsePage } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo";
import { legal, site } from "@/config/site";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: "What ProjectKit stores, what it does not, and where your project data lives.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy policy"
      intro="ProjectKit has no accounts and keeps your projects in your own browser."
      updated={legal.lastUpdated}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Privacy", path: "/privacy" },
      ]}
    >
      <LegalReviewNote>
        This is a plain-language starting point written for a planning utility. Have it reviewed by
        a qualified lawyer for your jurisdiction — GDPR, UK GDPR, CCPA/CPRA, and state privacy laws
        each impose specific disclosure and rights language — before publishing it as your policy.
      </LegalReviewNote>

      <section>
        <h2>The short version</h2>
        <ul>
          <li>No account is required and none is offered.</li>
          <li>Your saved projects, notes, and shopping list live in your browser&apos;s local storage, not on our servers.</li>
          <li>We do not sell personal information.</li>
          <li>We do not ask for your address, phone number, or property details.</li>
        </ul>
      </section>

      <section>
        <h2>What stays on your device</h2>
        <p>
          Saved projects — the planner you used, the values you entered, your notes, which shopping
          list items you have ticked off, and any contractor quote you typed in — are stored in
          local storage in your browser. They are not transmitted to us. Clearing your browser data
          deletes them permanently, and they are not recoverable.
        </p>
        <p>
          You can delete any saved project at any time from{" "}
          <Link href="/my-projects">My projects</Link>.
        </p>
      </section>

      <section>
        <h2>What reaches our servers</h2>
        <h3>Natural-language project descriptions</h3>
        <p>
          If you type a description into the &ldquo;What are you trying to build?&rdquo; box, that
          text is sent to our server so it can be matched to a planner. When our own pattern
          matching cannot interpret it and an AI provider is configured for this deployment, the
          text may also be sent to that provider to extract measurements. Please do not include
          personal information in that box — it is a description of a building project, and nothing
          more is needed.
        </p>

        <h3>Payments</h3>
        <p>
          If you purchase a Project Pack, payment is handled entirely by Stripe. Card details are
          entered on Stripe&apos;s systems and never reach ProjectKit — we never see, receive, or
          store a card number. We receive only a session reference confirming whether a payment
          succeeded. Stripe&apos;s own privacy policy governs the data they collect.
        </p>

        <h3>Standard request logs</h3>
        <p>
          Our hosting provider records the usual web-server information — IP address, user agent,
          requested URL, timestamp — for security and reliability. This is ordinary infrastructure
          logging, not profiling.
        </p>
      </section>

      <section>
        <h2>Analytics</h2>
        <p>
          If analytics are enabled on this deployment, we record which pages are viewed and which
          product actions occur — a project calculated, a pack previewed, a link followed. Events
          carry no free-text input, no measurements you entered, and no notes. IP anonymisation is
          enabled where the provider supports it. If no analytics identifier is configured, no
          analytics script loads at all.
        </p>
      </section>

      <section>
        <h2>Advertising and affiliate links</h2>
        <p>
          ProjectKit may display advertising and may earn a commission when you follow a link to a
          retailer and make a purchase. Affiliate links are marked. Advertising and affiliate
          partners set their own cookies and are governed by their own privacy policies. Where
          advertising is not configured on a deployment, no advertising code is loaded.
        </p>
      </section>

      <section>
        <h2>Cookies and local storage</h2>
        <p>
          ProjectKit itself does not set tracking cookies. It uses browser local storage for your
          saved projects and to remember that a Project Pack has been unlocked. Third-party
          analytics or advertising, where enabled, may set their own cookies.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          ProjectKit is intended for adults planning home improvement work and is not directed at
          children.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Delete saved projects individually from My projects, or clear your browser&apos;s site data to remove all of them.</li>
          <li>Use ProjectKit without ever typing a description into the natural-language box — every planner works directly.</li>
          <li>Use browser or extension-level controls to block analytics and advertising.</li>
        </ul>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes materially, the date at the top of this page will change with it.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about privacy: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
      </section>
    </ProsePage>
  );
}
