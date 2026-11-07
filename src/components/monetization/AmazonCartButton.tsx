"use client";

import { ShoppingCart } from "lucide-react";
import { usePathname } from "next/navigation";
import { retailers, whereToBuyEnabled } from "@/config/retailers";
import { amazonCartUrl } from "@/config/amazonCart";
import { sourceFromPath, track } from "@/lib/analytics";
import { cartBreakdown, cartLinesFor, type CartEntryLike } from "@/lib/shopping/cart";

export { cartLinesFor, type CartEntryLike } from "@/lib/shopping/cart";

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
  placement = "shopping_list",
  className = "",
}: {
  entries: CartEntryLike[];
  checked: ReadonlySet<string>;
  projectType?: string;
  /** Which surface the button sits on, for the click event. */
  placement?: "shopping_list" | "result_summary";
  className?: string;
}) {
  const pathname = usePathname();
  const amazon = retailers.find((retailer) => retailer.id === "amazon");
  if (!whereToBuyEnabled || !amazon) return null;

  const lines = cartLinesFor(entries, checked);
  if (lines.length === 0) return null;

  const count = lines.length;
  const { materials, tools } = cartBreakdown(entries, checked);
  const parts = [
    materials > 0 ? `${materials} ${materials === 1 ? "material" : "materials"}` : null,
    tools > 0 ? `${tools} ${tools === 1 ? "tool or supply" : "tools and supplies"}` : null,
  ].filter(Boolean);
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
            placement,
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
      <span className="text-xs text-ink-subtle">
        {parts.length > 0 ? `${parts.join(", ")}. ` : ""}Paid link. Skips anything you tick off.
      </span>
    </div>
  );
}
