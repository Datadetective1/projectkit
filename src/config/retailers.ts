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

export type RetailerId = "home_depot" | "lowes" | "amazon" | "local_supplier";

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
  fromEnv(
    "home_depot",
    "Home Depot",
    process.env.NEXT_PUBLIC_RETAILER_HOME_DEPOT_URL,
    process.env.NEXT_PUBLIC_RETAILER_HOME_DEPOT_AFFILIATE,
    process.env.NEXT_PUBLIC_RETAILER_HOME_DEPOT_DISCLOSURE,
  ),
  fromEnv(
    "lowes",
    "Lowe's",
    process.env.NEXT_PUBLIC_RETAILER_LOWES_URL,
    process.env.NEXT_PUBLIC_RETAILER_LOWES_AFFILIATE,
    process.env.NEXT_PUBLIC_RETAILER_LOWES_DISCLOSURE,
  ),
  fromEnv(
    "amazon",
    "Amazon",
    process.env.NEXT_PUBLIC_RETAILER_AMAZON_URL,
    process.env.NEXT_PUBLIC_RETAILER_AMAZON_AFFILIATE,
    process.env.NEXT_PUBLIC_RETAILER_AMAZON_DISCLOSURE,
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
 * Two conditions, both required: the feature is switched on *and* at least one
 * destination is configured. An empty panel promising retailers is worse than
 * no panel.
 */
export const whereToBuyEnabled =
  process.env.NEXT_PUBLIC_WHERE_TO_BUY_ENABLED === "true" && retailers.length > 0;

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
