"use client";

import { ShoppingCart } from "lucide-react";
import { usePathname } from "next/navigation";
import { retailers, whereToBuyEnabled } from "@/config/retailers";
import { amazonCartUrl, amazonPickFor, cartQuantity, type CartLine } from "@/config/amazonCart";
import { sourceFromPath, track } from "@/lib/analytics";
import { hasRetailerLink, type ShoppingEntryLike } from "@/lib/shopping/groups";

export interface CartEntryLike extends ShoppingEntryLike {
  optional?: boolean;
  /** The line's computed amount in its own unit. Absent for a tool. */
  quantity?: number;
}

/**
 * The lines the cart button would add: linked, not ticked off, not optional,
 * and with a product picked. Exported so the label, the URL and the tests all
 * count the same thing.
 */
export function cartLinesFor(entries: CartEntryLike[], checked: ReadonlySet<string>): CartLine[] {
  const lines: CartLine[] = [];
  for (const entry of entries) {
    if (entry.optional || checked.has(entry.id)) continue;
    if (!hasRetailerLink(entry)) continue;
    const pick = amazonPickFor(entry.searchTerm);
    if (!pick) continue;
    lines.push({ asin: pick.asin, quantity: cartQuantity(pick, entry.quantity) });
  }
  return lines;
}

/**
 * Everything on the list that Amazon sells, into one Amazon cart, in one tap.
 *
 * Skips what the person has ticked off, so ticking "I have a float already"
 * keeps it out of the cart. Nothing is bought here: Amazon shows the cart and
 * the person decides there.
 */
export function AmazonCartButton({
  entries,
  checked,
  projectType,
  className = "",
}: {
  entries: CartEntryLike[];
  checked: ReadonlySet<string>;
  projectType?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const amazon = retailers.find((retailer) => retailer.id === "amazon");
  if (!whereToBuyEnabled || !amazon) return null;

  const lines = cartLinesFor(entries, checked);
  if (lines.length === 0) return null;

  const count = lines.length;
  return (
    <div className={`pk-no-print flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      <a
        href={amazonCartUrl(lines)}
        target="_blank"
        rel="noopener noreferrer sponsored"
        data-testid="amazon-cart"
        onClick={() =>
          track("retailer_click", {
            retailer: "amazon",
            projectType,
            materialId: "cart-all",
            itemsReady: count,
            placement: "shopping_list",
            source: sourceFromPath(pathname ?? "/"),
          })
        }
        className="pk-btn pk-btn-primary h-10 px-4 text-sm"
      >
        <ShoppingCart className="h-4 w-4" aria-hidden />
        Add {count} {count === 1 ? "item" : "items"} to Amazon cart
        {" "}
        <span className="sr-only">, a paid affiliate link (opens in a new tab)</span>
      </a>
      <span className="text-xs text-ink-subtle">Paid link. Skips anything you tick off.</span>
    </div>
  );
}
