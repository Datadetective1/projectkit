import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { defaultValues, evaluate } from "@/lib/calc/engine";
import {
  AMAZON_CART_TAG,
  AMAZON_PICKS,
  amazonCartUrl,
  amazonPickFor,
  cartQuantity,
} from "@/config/amazonCart";
import { cartLinesFor } from "@/components/monetization/AmazonCartButton";
import { buildShoppingList } from "@/components/results/ShoppingList";
import { hasRetailerLink } from "@/lib/shopping/groups";
import type { ProjectDefinition } from "@/types/project";

/** Every linked search term any planner can produce, across its select options. */
function linkedTerms(): Set<string> {
  const terms = new Set<string>();
  for (const project of projects) {
    const base = defaultValues(project, "us");
    let combos: Record<string, unknown>[] = [{}];
    for (const input of project.inputs) {
      const values: unknown[] =
        input.type === "select"
          ? input.options.map((option) => option.value)
          : input.type === "toggle"
            ? [true, false]
            : [];
      if (values.length === 0) continue;
      combos = combos
        .flatMap((combo) => values.map((value) => ({ ...combo, [input.id]: value })))
        .slice(0, 200);
    }
    for (const combo of combos) {
      const result = evaluate(project, { ...base, ...combo } as never, "us");
      if (!result.ok) continue;
      for (const entry of buildShoppingList(result.result, "us")) {
        if (entry.searchTerm && hasRetailerLink(entry)) terms.add(entry.searchTerm);
      }
    }
  }
  return terms;
}

function entriesFor(slug: string) {
  const project = projects.find((p) => p.slug === slug) as ProjectDefinition;
  const result = evaluate(project, defaultValues(project, "us"), "us");
  if (!result.ok) throw new Error(slug);
  return buildShoppingList(result.result, "us");
}

describe("Amazon cart picks", () => {
  it("only picks products for lines that actually carry an Amazon link", () => {
    const terms = linkedTerms();
    const orphans = Object.keys(AMAZON_PICKS).filter((term) => !terms.has(term));
    expect(orphans).toEqual([]);
  });

  it("uses well-formed ASINs and positive pack sizes", () => {
    for (const [term, pick] of Object.entries(AMAZON_PICKS)) {
      expect(pick.asin, term).toMatch(/^[A-Z0-9]{10}$/);
      expect(pick.covers, term).toBeGreaterThan(0);
    }
  });

  it("leaves taste and size choices to a search", () => {
    for (const term of ["floor tile", "interior wall paint", "fence pickets", "drywall sheets"]) {
      expect(amazonPickFor(term)).toBeUndefined();
    }
  });
});

describe("cart quantities", () => {
  it("turns a computed count into packs", () => {
    expect(cartQuantity({ asin: "B000000000", covers: 50, product: "" }, 28)).toBe(1);
    expect(cartQuantity({ asin: "B000000000", covers: 25, product: "" }, 28)).toBe(2);
    expect(cartQuantity({ asin: "B000000000", covers: 5, product: "" }, 5)).toBe(1);
  });

  it("adds one of a tool", () => {
    expect(cartQuantity({ asin: "B000000000", covers: 1, product: "" }, undefined)).toBe(1);
  });

  it("never asks Amazon for a silly quantity", () => {
    expect(cartQuantity({ asin: "B000000000", covers: 1, product: "" }, 5000)).toBe(99);
  });
});

describe("cart URL", () => {
  it("is Amazon's add-to-cart form with the associate tag and numbered items", () => {
    const url = new URL(
      amazonCartUrl([
        { asin: "B00002N5Q0", quantity: 1 },
        { asin: "B0BYQJG5NK", quantity: 2 },
      ]),
    );
    expect(url.origin + url.pathname).toBe("https://www.amazon.com/gp/aws/cart/add.html");
    expect(url.searchParams.get("AssociateTag")).toBe(AMAZON_CART_TAG);
    expect(AMAZON_CART_TAG).toBe("cubitora86-20");
    expect(url.searchParams.get("ASIN.1")).toBe("B00002N5Q0");
    expect(url.searchParams.get("Quantity.1")).toBe("1");
    expect(url.searchParams.get("ASIN.2")).toBe("B0BYQJG5NK");
    expect(url.searchParams.get("Quantity.2")).toBe("2");
  });

  it("merges two lines that picked the same product", () => {
    const url = new URL(
      amazonCartUrl([
        { asin: "B00002N5Q0", quantity: 1 },
        { asin: "B00002N5Q0", quantity: 2 },
      ]),
    );
    expect(url.searchParams.get("Quantity.1")).toBe("3");
    expect(url.searchParams.has("ASIN.2")).toBe(false);
  });
});

describe("what the concrete planner's button adds", () => {
  const entries = entriesFor("concrete-calculator");

  it("adds the stakes and the tools, and skips ready-mix and gravel", () => {
    const lines = cartLinesFor(entries, new Set());
    const asins = lines.map((line) => line.asin);
    expect(asins).toContain(AMAZON_PICKS["wood form stakes"].asin);
    expect(asins).toContain(AMAZON_PICKS["concrete magnesium float"].asin);
    expect(lines.length).toBeGreaterThan(3);
  });

  it("skips anything ticked off", () => {
    const all = cartLinesFor(entries, new Set());
    const fewer = cartLinesFor(entries, new Set(["extra:float"]));
    expect(fewer.length).toBe(all.length - 1);
    expect(fewer.map((line) => line.asin)).not.toContain(
      AMAZON_PICKS["concrete magnesium float"].asin,
    );
  });

  it("skips optional lines", () => {
    const optional = entries.filter((entry) => entry.optional).map((entry) => entry.searchTerm);
    const asins = cartLinesFor(entries, new Set()).map((line) => line.asin);
    for (const term of optional) {
      const pick = amazonPickFor(term);
      if (pick) expect(asins).not.toContain(pick.asin);
    }
  });
});
