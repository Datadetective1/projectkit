import { retailers, whereToBuyEnabled } from "@/config/retailers";

/**
 * The affiliate disclosure, once per list rather than once per link.
 *
 * Amazon's Operating Agreement requires the statement to be displayed, and it
 * has to be near the links rather than buried in a page footer. It does not
 * require it beside every single link — and repeating it on each of twelve
 * shopping-list rows turned a checklist into something that read like an
 * affiliate page, which is the exact impression a planning tool cannot afford.
 *
 * So: one line, at the head of the list, above the first link. Each programme's
 * own wording verbatim, because paraphrasing a required disclosure is a
 * compliance failure.
 */
export function RetailerDisclosure({ className = "" }: { className?: string }) {
  if (!whereToBuyEnabled) return null;

  const disclosures = Array.from(
    new Set(
      retailers
        .filter((retailer) => retailer.affiliate && retailer.disclosure)
        .map((retailer) => retailer.disclosure as string),
    ),
  );
  if (disclosures.length === 0) return null;

  return (
    <p className={`pk-no-print text-xs leading-snug text-ink-subtle ${className}`}>
      {disclosures.join(" ")} Links go to a search, not a chosen product, and they never change
      the quantities above.
    </p>
  );
}
