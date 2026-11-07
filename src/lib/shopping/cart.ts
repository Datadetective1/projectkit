import { amazonPickFor, cartQuantity, type CartLine } from "@/config/amazonCart";
import { countReadyToBuy, hasRetailerLink, isSupply, type ShoppingEntryLike } from "@/lib/shopping/groups";

export interface CartEntryLike extends ShoppingEntryLike {
  optional?: boolean;
  /** The line's computed amount in its own unit. Absent for a tool. */
  quantity?: number;
}

function inCart(entry: CartEntryLike, checked: ReadonlySet<string>) {
  if (entry.optional || checked.has(entry.id)) return false;
  if (!hasRetailerLink(entry)) return false;
  return Boolean(amazonPickFor(entry.searchTerm));
}

/**
 * The lines the Amazon cart would add: linked, not ticked off, not optional,
 * and with a product picked.
 */
export function cartLinesFor(entries: CartEntryLike[], checked: ReadonlySet<string>): CartLine[] {
  const lines: CartLine[] = [];
  for (const entry of entries) {
    if (!inCart(entry, checked)) continue;
    const pick = amazonPickFor(entry.searchTerm)!;
    lines.push({ asin: pick.asin, quantity: cartQuantity(pick, entry.quantity) });
  }
  return lines;
}

/** What the cart holds, split into materials and tools, for the line under the button. */
export function cartBreakdown(entries: CartEntryLike[], checked: ReadonlySet<string>) {
  const items = entries.filter((entry) => inCart(entry, checked));
  const tools = items.filter(isSupply).length;
  return { total: items.length, materials: items.length - tools, tools };
}

/**
 * The one "ready to buy online" number.
 *
 * It used to count only materials that ship, while the cart button under it
 * added tools as well, so the page said "2 items ready to buy online" above
 * "Add 7 items to Amazon cart". Now every surface that quotes a count (the
 * result card, the mobile bar, the analytics) quotes what one tap actually
 * buys. Only when nothing on the list has a picked product does it fall back
 * to the materials that can be searched for online.
 */
export function readyOnlineCount(entries: CartEntryLike[], checked: ReadonlySet<string>): number {
  const cart = cartLinesFor(entries, checked).length;
  return cart > 0 ? cart : countReadyToBuy(entries);
}
