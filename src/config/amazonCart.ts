import { AMAZON_STORE_ID } from "@/config/retailers";

/**
 * One Amazon product per shopping-list line, for the "Add to Amazon cart" button.
 *
 * Every "Shop on Amazon" link opens a search, so someone with eight things to
 * buy had to run eight searches. The button sends the whole list to an Amazon
 * cart in one tap instead, through Amazon's documented Associates add-to-cart
 * form. That needs an actual product, which is what this file holds.
 *
 * **To change a pick, edit one line below.** Keys are the line's search term
 * (`MaterialLine.searchTerm` or `ShoppingItem.searchTerm`), so a term shared by
 * two planners, such as "landscape rake", shares one pick.
 *
 * A term with no entry simply stays out of the cart and keeps its search link.
 * That is deliberate for anything whose right product is a matter of taste or
 * size (flooring, tile, wall paint, lumber, drywall sheets), and for big tools
 * most people rent or own (saws, post hole diggers, wheelbarrows).
 *
 * `covers` says how much of the line's own unit one Amazon listing supplies,
 * so the cart quantity follows the calculation: 28 stakes against a 25-pack is
 * 2 packs. Tools and one-off supplies cover 1.
 */
export interface AmazonPick {
  /** Amazon's 10-character product id. */
  asin: string;
  /** How many of the line's units one listing supplies. */
  covers: number;
  /** What the listing is, for whoever edits this file. Not shown on the site. */
  product: string;
}

export const AMAZON_PICKS: Readonly<Record<string, AmazonPick>> = {
  "wood form stakes": { asin: "B0BYQJG5NK", covers: 50, product: "Sandbaggy 24 in Douglas fir stakes, 50-pack" },
  "concrete expansion joint": { asin: "B001APWKSE", covers: 1, product: "Quikrete fiber expansion joint strip, 5 ft" },
  "concrete magnesium float": { asin: "B00002N5Q0", covers: 1, product: "Marshalltown 145D 16 in magnesium hand float" },
  "concrete edger groover": { asin: "B001RJ2G7I", covers: 1, product: "Marshalltown 3489D stainless edger with groover" },
  "concrete curing compound": { asin: "B0B237574D", covers: 1, product: "Akona water-based cure and seal, 1 gal" },
  "waterproof work gloves": { asin: "B08L45BWX6", covers: 1, product: "Kinco Hydroflector waterproof nitrile gloves" },
  "rebar chairs": { asin: "B01CA2HQR0", covers: 1, product: "Lotel 2 in mesh chairs, 250-pack" },
  "fast setting concrete mix": { asin: "B017086WI8", covers: 1, product: "Sakrete fast setting concrete, 50 lb bag" },
  "fence gate hardware kit": { asin: "B08DS48MPW", covers: 1, product: "Gate kit: self-locking latch, T-strap hinges, handle" },
  "exterior deck screws": { asin: "B0100IL9GA", covers: 5, product: "Deck Plus #10 x 3 in exterior screws, 5 lb box" },
  "mason string line": { asin: "B0BFBRRQ3P", covers: 1, product: "#18 braided nylon mason line, 250 ft" },
  "post level": { asin: "B005XUHK5A", covers: 1, product: "Irwin magnetic post level" },
  "fence post caps": { asin: "B0CRR1XW37", covers: 12, product: "4x4 post caps, 12-pack with screws" },
  "joist hangers": { asin: "B000V9ATEC", covers: 1, product: "Simpson Strong-Tie LUS28 joist hanger for 2x8" },
  "deck screws": { asin: "B0100ICU22", covers: 5, product: "Deck Plus #10 x 2-1/2 in deck screws, 5 lb box" },
  "deck ledger flashing": { asin: "B01MU9EXYV", covers: 1, product: "DeckWise WiseWrap ledger flashing tape, 12 in x 25 ft, 2 rolls" },
  "thinset mortar": { asin: "B017083WWM", covers: 1, product: "Custom Building Products gray thinset, 50 lb" },
  "tile spacers": { asin: "B0026T5MMY", covers: 1, product: "QEP 1/8 in tile spacers, 1,000-pack" },
  "notched trowel tile": { asin: "B000FK1TUK", covers: 1, product: "QEP 1/4 x 3/8 in square-notch trowel" },
  "grout float": { asin: "B000LDE6ME", covers: 1, product: "QEP gum rubber grout float" },
  "grout sponge": { asin: "B002YLRHPY", covers: 1, product: "QEP extra large grout sponge" },
  "grout sealer": { asin: "B0039ZDMLC", covers: 1, product: "Aqua Mix Sealer's Choice Gold, 1 pint" },
  "tile waterproofing membrane": { asin: "B000NZ73SE", covers: 1, product: "Custom RedGard waterproofing membrane, 1 gal" },
  "drywall screws": { asin: "B00004YVI5", covers: 1, product: "Grip Rite 1-5/8 in coarse drywall screws, 1 lb box" },
  "all purpose joint compound": { asin: "B09V93TLTC", covers: 1, product: "Sheetrock all-purpose joint compound, 4.5 gal pail" },
  "drywall joint tape": { asin: "B000H5OZUE", covers: 1, product: "Sheetrock paper joint tape, 250 ft roll" },
  "drywall t-square": { asin: "B00004T7ZS", covers: 1, product: "Johnson 48 in aluminum drywall T-square" },
  "utility knife blades": { asin: "B000051WTG", covers: 1, product: "Stanley quick-change utility knife with 3 blades" },
  "drywall taping knife set": { asin: "B07FDSLXPC", covers: 1, product: "USG Sheetrock 6/10/12 in taping knife set with mud pan" },
  "dust masks": { asin: "B007ZUDVC2", covers: 1, product: "3M 8511 N95 drywall sanding respirators, 10-pack" },
  "interior primer": { asin: "B0013FE5R0", covers: 1, product: "KILZ 2 all-purpose primer, 1 gal" },
  "painters tape": { asin: "B00004Z4DU", covers: 1, product: "ScotchBlue painter's tape 1.88 in x 60 yd, 1 roll" },
  "paint roller covers": { asin: "B00MG4DNOS", covers: 3, product: "Wooster Pro Doo-Z 9 in 3/8 nap roller covers, 3-pack" },
  "angled sash paint brush": { asin: "B0000DH4KH", covers: 1, product: "Purdy XL Glide 2-1/2 in brush" },
  "paint tray liners": { asin: "B078KFGLVG", covers: 1, product: "9 in metal paint tray with 10 liners" },
  "canvas drop cloth": { asin: "B00176V7JO", covers: 1, product: "Trimaco SuperTuff canvas drop cloth 9 x 12 ft" },
  "spackle putty knife": { asin: "B0787YVM95", covers: 1, product: "DAP DryDex spackling repair kit with putty knife" },
  "fine sanding sponge": { asin: "B001RB20BS", covers: 1, product: "3M angled sanding sponges, fine, 6-pack" },
  "paintable caulk": { asin: "B00GVLHBDG", covers: 1, product: "DAP Alex Plus acrylic latex caulk, 10.1 oz" },
  "flooring tapping block pull bar": { asin: "B001HRTY2K", covers: 1, product: "Roberts floor install kit: spacers, tapping block, pull bar" },
  "knee pads": { asin: "B0BS6Z5S6Y", covers: 1, product: "NoCry professional gel knee pads" },
  "concrete subfloor moisture barrier": { asin: "B00A52RQV4", covers: 100, product: "6 mil poly vapor barrier underlayment, 100 sq ft roll" },
  "self leveling floor compound": { asin: "B00IPUB5MO", covers: 1, product: "Henry 555 Level Pro self-leveling underlayment, 40 lb" },
  "garden rake": { asin: "B00ARTK89W", covers: 1, product: "Bully Tools 16-tine steel bow rake" },
  "garden bed edging": { asin: "B01MG4ARN7", covers: 1, product: "EasyFlex no-dig edging kit, 100 ft" },
  "heavy duty tarp": { asin: "B07GZ28B7G", covers: 1, product: "Xpose Safety 10 x 12 ft heavy duty poly tarp" },
  "landscape edging": { asin: "B0CX26D6RW", covers: 1, product: "EdgePro steel landscape edging, 20 ft" },
  "landscape rake": { asin: "B0009I8POG", covers: 1, product: "Union Tools 36 in aluminum landscape rake" },
  "hand tamper": { asin: "B0009XEN60", covers: 1, product: "True Temper 10 x 10 in steel tamper" },
  "sod knife": { asin: "B08S7LSTKW", covers: 1, product: "Fiskars hori hori garden knife with sheath" },
  "lawn sprinkler": { asin: "B00004SDVX", covers: 1, product: "Melnor XT Turbo oscillating sprinkler" },
};

/** The store id the add-to-cart form credits. Same tag as every search link. */
export const AMAZON_CART_TAG = AMAZON_STORE_ID;

/** Amazon's documented Associates add-to-cart endpoint. */
const AMAZON_CART_ENDPOINT = "https://www.amazon.com/gp/aws/cart/add.html";

/** Amazon rejects silly quantities; nothing on a home project needs more. */
const MAX_QUANTITY = 99;

export interface CartLine {
  asin: string;
  quantity: number;
}

/** The pick for a search term, if one exists. */
export function amazonPickFor(searchTerm: string | undefined): AmazonPick | undefined {
  if (!searchTerm) return undefined;
  return AMAZON_PICKS[searchTerm.trim()];
}

/**
 * How many listings to add for a line.
 *
 * `quantity` is the line's computed amount in its own unit, or undefined for a
 * tool. Always at least one, never more than `MAX_QUANTITY`.
 */
export function cartQuantity(pick: AmazonPick, quantity: number | undefined): number {
  if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) return 1;
  const covers = pick.covers > 0 ? pick.covers : 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.ceil(quantity / covers - 1e-9)));
}

/**
 * Merge lines that share a product, so two lines picking the same screws add
 * one row with the summed quantity rather than two rows Amazon may collapse.
 */
export function mergeCartLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    merged.set(line.asin, Math.min(MAX_QUANTITY, (merged.get(line.asin) ?? 0) + line.quantity));
  }
  return Array.from(merged, ([asin, quantity]) => ({ asin, quantity }));
}

/** The add-to-cart URL for a set of lines, with the associate tag. */
export function amazonCartUrl(lines: CartLine[]): string {
  const params = new URLSearchParams();
  params.set("AssociateTag", AMAZON_CART_TAG);
  mergeCartLines(lines).forEach((line, index) => {
    params.set(`ASIN.${index + 1}`, line.asin);
    params.set(`Quantity.${index + 1}`, String(line.quantity));
  });
  return `${AMAZON_CART_ENDPOINT}?${params.toString()}`;
}
