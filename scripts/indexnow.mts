import {
  INDEXNOW_KEY,
  filterSubmittable,
  keyFileUrl,
  publicUrls,
  submitUrls,
} from "../src/lib/indexnow";
import { site } from "../src/config/site";

/**
 * IndexNow submission CLI.
 *
 *   npm run indexnow                    # every public page
 *   npm run indexnow -- /concrete-calculator
 *   npm run indexnow -- / /projects /about
 *   npm run indexnow -- --dry-run       # show what would be sent
 *
 * Paths are resolved against the canonical host, so a path and a full URL both
 * work and neither can accidentally target a preview deployment.
 *
 * Exits non-zero on a rejected submission so it is usable in a deploy hook,
 * but nothing here throws — a rate limit or an unreachable endpoint is a
 * non-event, since the sitemap still exists and the crawler still comes.
 */

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const targets = args.filter((arg) => !arg.startsWith("--"));

const urls =
  targets.length === 0
    ? publicUrls()
    : targets.map((target) =>
        target.startsWith("http")
          ? target
          : `${site.url}${target.startsWith("/") ? target : `/${target}`}`.replace(/\/$/, "") ||
            site.url,
      );

const { valid, rejected } = filterSubmittable(urls);

console.log(`host         ${new URL(site.url).host}`);
console.log(`key          ${INDEXNOW_KEY}`);
console.log(`keyLocation  ${keyFileUrl()}`);
console.log(`\n${valid.length} URL${valid.length === 1 ? "" : "s"} to submit:`);
for (const url of valid) console.log(`  + ${url}`);

if (rejected.length > 0) {
  console.log(`\n${rejected.length} rejected:`);
  for (const { url, reason } of rejected) console.log(`  - ${url}  (${reason})`);
}

if (dryRun) {
  console.log("\nDry run — nothing submitted.");
  process.exit(0);
}

if (valid.length === 0) {
  console.log("\nNothing to submit.");
  process.exit(1);
}

/*
 * Verify the key file first. A 403 from the endpoint is indistinguishable from
 * a dozen other problems, and checking takes one request — so check, and say
 * exactly what is wrong before spending the submission.
 */
console.log(`\nChecking ${keyFileUrl()} …`);
try {
  const response = await fetch(keyFileUrl(), { signal: AbortSignal.timeout(10_000) });
  const body = (await response.text()).trim();
  if (!response.ok) {
    console.error(`  key file returned ${response.status}. Submission would be rejected (403).`);
    process.exit(1);
  }
  if (body !== INDEXNOW_KEY) {
    console.error(`  key file contains "${body.slice(0, 40)}" but the submitter uses "${INDEXNOW_KEY}".`);
    process.exit(1);
  }
  console.log("  ok — key file matches.");
} catch (error) {
  console.error(`  could not fetch the key file: ${(error as Error).message}`);
  process.exit(1);
}

const result = await submitUrls(urls);

console.log(`\n${result.ok ? "OK" : "FAILED"}  ${result.status ?? "no response"}  ${result.message}`);
if (result.endpoint) console.log(`endpoint     ${result.endpoint}`);
console.log(`submitted    ${result.submitted.length}`);

process.exit(result.ok ? 0 : 1);
