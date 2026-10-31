import type { Measure } from "@/lib/units";

/**
 * How a shopping list divides into things you can order online and things that
 * arrive on a truck.
 *
 * This is the single place that decision is made. It used to live inside
 * `WhereToBuy`, which was fine while the only consumer was the link itself —
 * but three surfaces now depend on the same answer, and they must not be able
 * to disagree:
 *
 *  - the "here's what you need" card, which counts items ready to buy
 *  - the shopping list, which groups by it
 *  - the mobile sticky bar, which repeats the count
 *
 * A card promising "5 items ready to buy" above a list showing four is the kind
 * of small lie that costs more trust than the feature earns. So the rule lives
 * here, is exported once, and is tested against every planner.
 */

/**
 * What a general online retailer is not a realistic source for.
 *
 * Every link that leads somewhere useless costs more than it earns: it wastes a
 * click, and it makes the whole surface read as an affiliate page rather than a
 * shopping list.
 *
 *  - **volumeYd, weight** — bulk aggregate, ready-mix, mulch by the cubic yard
 *    or the ton. These arrive on a truck from a yard. An Amazon search for
 *    "ready mix concrete delivery" returns nothing anyone wants.
 *  - **length** — dimensional lumber sold by the linear foot: decking, joists,
 *    rim boards, form boards. Nobody ships 449 linear feet of decking. This
 *    also drops a couple of things Amazon does stock, like quarter round, and
 *    that trade is deliberate — a rule that is occasionally too strict beats a
 *    rule that occasionally sends someone to a dead end.
 *
 * `count`, `area` and `volumeLiquid` stay: fasteners, tape, grout, spacers,
 * paint, boxed flooring and tile are exactly what a general retailer sells.
 */
export const UNSUITABLE_MEASURES: ReadonlySet<Measure> = new Set<Measure>([
  "volumeYd",
  "weight",
  "length",
]);

/**
 * Materials no measure can rule out.
 *
 * Sod is quoted in square feet like anything else, but it is a perishable crop
 * delivered on pallets within a day of being cut. There is no version of that
 * which arrives in a parcel.
 */
export const UNSUITABLE_MATERIALS: ReadonlySet<string> = new Set(["sod-area"]);

/**
 * The shape this module needs, rather than the full `ShoppingEntry`.
 *
 * Structural on purpose: `ShoppingEntry` is declared in a client component, and
 * a `lib` module reaching back into `components` for a type is the beginning of
 * an import cycle. Everything here is pure and testable without React.
 */
export interface ShoppingEntryLike {
  /** `material:<id>` for a computed line, `extra:<id>` for a tool or supply. */
  id: string;
  searchTerm?: string;
  measure?: Measure;
}

export type ShoppingGroupId = "online" | "local" | "supplies";

export interface ShoppingGroup<T extends ShoppingEntryLike> {
  id: ShoppingGroupId;
  /** Written for a homeowner, not for us. Never mentions retailers or affiliates. */
  title: string;
  /** One line explaining why these are grouped together, when it is not obvious. */
  note?: string;
  entries: T[];
}

/** Strip the `material:` / `extra:` prefix a shopping list adds. */
export function materialIdOf(entryId: string): string {
  return entryId.replace(/^(material|extra):/, "");
}

/** True for the tools-and-supplies entries, which carry no computed quantity. */
export function isSupply(entry: ShoppingEntryLike): boolean {
  return entry.id.startsWith("extra:");
}

/**
 * Whether this line can sensibly be bought from a general online retailer.
 *
 * Needs a search term to link to, a measure a parcel carrier can handle, and to
 * not be one of the named exceptions.
 */
export function isDeliverableOnline(entry: ShoppingEntryLike): boolean {
  if (isSupply(entry)) return false;
  if (!entry.searchTerm) return false;
  if (entry.measure && UNSUITABLE_MEASURES.has(entry.measure)) return false;
  if (UNSUITABLE_MATERIALS.has(materialIdOf(entry.id))) return false;
  return true;
}

/**
 * Whether a line gets a "Shop on" link at all.
 *
 * Wider than `isDeliverableOnline`, and deliberately so. That predicate answers
 * "is this part of what you can put in a basket for the estimate", and it is
 * what the card counts. A hand tool is not part of the estimate, so it never
 * joins that count, but a float, an edger or a mud pan is exactly what a
 * general retailer sells, and someone reading the tools list is often about to
 * buy one. A tool gets a link only when its calculation gave it a search term,
 * which is withheld from rentals, permits, structural members and bulk goods.
 */
export function hasRetailerLink(entry: ShoppingEntryLike): boolean {
  if (isSupply(entry)) return Boolean(entry.searchTerm);
  return isDeliverableOnline(entry);
}

/**
 * The analytics id for a line, held to the same slug shape for both kinds.
 *
 * A tool's id is prefixed so a report can tell "the edger" from a material
 * that happens to share an authored id, such as gravel in two planners.
 */
export function analyticsIdOf(entryId: string): string {
  return isSupply({ id: entryId }) ? `tool-${materialIdOf(entryId)}` : materialIdOf(entryId);
}

/**
 * Split a shopping list into the three groups the results page shows.
 *
 * Empty groups are dropped, so a planner whose materials all arrive by truck —
 * mulch, gravel, sod — simply has no "ready to buy" heading rather than an
 * empty one promising nothing.
 */
export function groupShoppingEntries<T extends ShoppingEntryLike>(
  entries: T[],
): ShoppingGroup<T>[] {
  const online: T[] = [];
  const local: T[] = [];
  const supplies: T[] = [];

  for (const entry of entries) {
    if (isSupply(entry)) supplies.push(entry);
    else if (isDeliverableOnline(entry)) online.push(entry);
    else local.push(entry);
  }

  const groups: ShoppingGroup<T>[] = [
    {
      id: "online",
      title: "Ready to buy online",
      entries: online,
    },
    {
      id: "local",
      title: "Order from a local supplier",
      /*
       * Worth stating rather than leaving as an absence. Someone looking at a
       * cubic yard of gravel with no buy button needs to know that is the
       * correct answer and not a gap in the product.
       */
      note: "These come by the load from a local landscape or building supplier. Take the quantities below and call around for a price — delivery is usually charged separately.",
      entries: local,
    },
    {
      id: "supplies",
      title: "Tools and supplies to have ready",
      note: "Not counted in the estimate above. Most of these you either own already or can borrow.",
      entries: supplies,
    },
  ];

  return groups.filter((group) => group.entries.length > 0);
}

/**
 * How many items a person could put in a basket right now.
 *
 * The number the primary call to action is allowed to claim, and the reason
 * that call to action changes shape when it is zero.
 */
export function countReadyToBuy(entries: ShoppingEntryLike[]): number {
  return entries.filter(isDeliverableOnline).length;
}

/** How many arrive by truck from a local supplier. */
export function countLocalOnly(entries: ShoppingEntryLike[]): number {
  return entries.filter((entry) => !isSupply(entry) && !isDeliverableOnline(entry)).length;
}
