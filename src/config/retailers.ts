/**
 * Where a material can be bought.
 *
 * Cubitora has no retailer relationships. This file is the shape one would
 * slot into, not a claim that one exists — every destination is off unless an
 * environment variable turns it on, and there is not a single affiliate ID,
 * tag or tracking parameter anywhere in this repository.
 *
 * The reason to build the shape before the relationship: retrofitting
 * per-material destinations into a shopping list that only carries labels is a
 * much larger change than carrying one extra field from the start. The field
 * already exists on `MaterialLine` as `searchTerm` — it was simply being thrown
 * away before it reached the list.
 *
 * **What must stay true when a real programme is approved.** Affiliate links
 * carry `rel="sponsored"`, disclose the relationship at the point of the link
 * rather than in a footer, and never change what the calculator recommends. A
 * planner that steers quantities toward a commission is not a planning tool,
 * and no amount of revenue is worth being that.
 */

/**
 * Lowe's is deliberately absent. There is no programme, so there is no id —
 * an unused slot in this union is an invitation to configure something that
 * does not exist.
 */
export type RetailerId = "home_depot" | "amazon" | "local_supplier";

export interface Retailer {
  id: RetailerId;
  /** Shown on the link. */
  name: string;
  /**
   * A search URL with `{query}` where the material's search term goes.
   *
   * A *search* URL rather than a product URL, deliberately: Cubitora computes
   * quantities, not SKUs, and cannot know which of a retailer's forty concrete
   * mixes someone wants. Sending them to a search they can judge is honest;
   * picking a product for them is a recommendation the engine has not earned.
   */
  searchUrlTemplate: string;
  /**
   * True once a real affiliate agreement is in place. Drives the `sponsored`
   * rel and the disclosure — never inferred, always declared.
   */
  affiliate: boolean;
  /** Shown beside the link when `affiliate` is true. */
  disclosure?: string;
}

/**
 * Amazon Associates — the one approved programme, and the only destination
 * with an identifier committed to this repository.
 *
 * It is here rather than in an environment variable for a plain reason: an
 * associate tag is public by construction. It travels in the query string of
 * every affiliate link, visible to anyone who hovers one. Keeping it in the
 * repository makes it versioned and reviewable; keeping it in a dashboard makes
 * it invisible to code review and easy to lose.
 *
 * The URL shape is Amazon's documented search endpoint. Nothing about it is
 * guessed: `/s?k=` is their search path and `tag=` is the associate parameter.
 *
 * **Two obligations of the Associates Operating Agreement are enforced in code
 * rather than left to a checklist**: the disclosure below is displayed wherever
 * these links appear, and every link carries `rel="sponsored"`. A third —
 * affiliate links must not appear in email, PDFs, or other offline content —
 * is handled by keeping this out of the Project Pack; see the test that asserts
 * it.
 */
const AMAZON_STORE_ID = "cubitora86-20";

const AMAZON: Retailer = {
  id: "amazon",
  name: "Amazon",
  searchUrlTemplate: `https://www.amazon.com/s?k={query}&tag=${AMAZON_STORE_ID}`,
  affiliate: true,
  disclosure: "As an Amazon Associate, Cubitora earns from qualifying purchases.",
};

/**
 * Read a retailer from the environment.
 *
 * Absent variable means absent retailer. There is no default URL and no
 * fallback — a destination nobody configured must not appear, because a link
 * that looks like a partnership and is not is the thing that costs trust.
 */
function fromEnv(
  id: RetailerId,
  name: string,
  url: string | undefined,
  affiliate: string | undefined,
  disclosure: string | undefined,
): Retailer | null {
  const template = url?.trim();
  if (!template || !template.includes("{query}")) return null;

  return {
    id,
    name,
    searchUrlTemplate: template,
    affiliate: affiliate === "true",
    disclosure: disclosure?.trim() || undefined,
  };
}

/** Every configured retailer, in the order they should be offered. */
export const retailers: Retailer[] = [
  AMAZON,
  fromEnv(
    "home_depot",
    "Home Depot",
    process.env.NEXT_PUBLIC_RETAILER_HOME_DEPOT_URL,
    process.env.NEXT_PUBLIC_RETAILER_HOME_DEPOT_AFFILIATE,
    process.env.NEXT_PUBLIC_RETAILER_HOME_DEPOT_DISCLOSURE,
  ),
  fromEnv(
    "local_supplier",
    process.env.NEXT_PUBLIC_RETAILER_LOCAL_NAME?.trim() || "Local supplier",
    process.env.NEXT_PUBLIC_RETAILER_LOCAL_URL,
    process.env.NEXT_PUBLIC_RETAILER_LOCAL_AFFILIATE,
    process.env.NEXT_PUBLIC_RETAILER_LOCAL_DISCLOSURE,
  ),
].filter((retailer): retailer is Retailer => retailer !== null);

/**
 * Whether the "Where to buy" surface should appear at all.
 *
 * The default flipped when Amazon was approved, and the reason the flag existed
 * flipped with it. It was there to stop an empty panel promising retailers that
 * did not exist; now one does, so the panel is on whenever there is somewhere
 * to send people.
 *
 * What remains is a kill switch rather than an on switch: setting
 * `NEXT_PUBLIC_WHERE_TO_BUY_ENABLED=false` removes every outbound link without
 * a code change, which is the control worth having if a programme is suspended
 * or something looks wrong in production.
 */
export const whereToBuyEnabled =
  process.env.NEXT_PUBLIC_WHERE_TO_BUY_ENABLED !== "false" && retailers.length > 0;

/** Build a retailer URL for a material's search term. */
export function retailerUrl(retailer: Retailer, query: string): string {
  return retailer.searchUrlTemplate.replace("{query}", encodeURIComponent(query.trim()));
}

/**
 * The `rel` for an outbound retailer link.
 *
 * `sponsored` only when the link genuinely is. Google asks for the distinction
 * and, more to the point, marking a non-commercial link as sponsored is a lie
 * in the other direction.
 */
export function retailerRel(retailer: Retailer): string {
  return retailer.affiliate
    ? "noopener noreferrer sponsored"
    : "noopener noreferrer";
}
