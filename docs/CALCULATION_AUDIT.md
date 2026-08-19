# Calculation Audit

Every formula and constant behind the ten planners, checked against sources
outside this repository. Written during the pre-launch audit on the
`prelaunch-hardening` branch.

The premise of the audit was that the existing tests could not be trusted to
prove correctness. They asserted that the code produced the numbers the code
produced. Four of the defects below passed the full suite before this work, and
one of them would have had a homeowner build a deck to fabricated framing
quantities.

## How each figure was checked

Three questions, in order:

1. **Is the geometry right?** Derived by hand from the inputs and compared to
   the implementation.
2. **Is the constant real?** Traced to a manufacturer's published figure, a
   supplier's spec, or a stated trade convention. Anything that could not be
   traced was either removed or reclassified as an assumption shown to the user.
3. **Does it fail safe?** Where a figure is uncertain, does the error land on
   "buy one spare" rather than "run out mid-job"?

Probe harnesses used, all committed and re-runnable:

| Script | What it does |
| --- | --- |
| `scripts/audit-calculations.mts` | Dumps headline, summary, materials, and cost for eleven probe cases, plus a US/metric parity table |
| `scripts/audit-drywall-tape.mts` | Derives real seam length across five room sizes, cross-checked against the trade's linear-ft-per-1,000-sq-ft figure |
| `scripts/audit-formulas.mts` | Dumps every formula and assumption each planner exposes |
| `scripts/audit-metric-prose.mts` | Finds imperial units surviving in metric-mode output |

## Defects found and fixed

### 1. Flooring trim under-ordered on any non-square room — CRITICAL

Perimeter was computed as `4 × √area`, which is only correct for a square. A
40 × 5 ft hallway is 200 sq ft, so the old code suggested 57 ft of quarter
round against a true perimeter of 90 ft — a 37% shortfall, and the failure gets
worse the longer and narrower the room.

Now summed per room: `Σ 2 × (length + width)`, which also fixes the multi-room
case the old formula could not express at all.

Guarded by `tests/unit/calculations.matrix.test.ts` → "flooring trim follows the
real perimeter, not an area approximation".

### 2. Drywall tape over-ordered by 3.5× — HIGH

`drywallTapeFtPerSheet` was 40 — roughly the perimeter of a 4 × 8 sheet, as if
every edge of every sheet needed taping. In reality each seam is shared between
two sheets, and sheets butt against ceilings and corners that are taped once.

Derived the real figure two independent ways in `scripts/audit-drywall-tape.mts`:

- **Geometric.** Counting horizontal wall seams, vertical butt joints, inside
  corners, the ceiling angle, and ceiling seams across five room sizes gives
  9–12 ft per sheet.
- **Trade cross-check.** The commonly published figure is ~380 linear ft of tape
  per 1,000 sq ft of board. At 32 sq ft per sheet that is ~12.2 ft per sheet.

Both agree. Set to **12**, the top of the geometric range so the estimate errs
toward a spare roll.

### 3. Tile thinset under-ordered for large-format tile — HIGH

A single flat `thinsetCoverageSqFtPer50lb: 95` ignored that coverage is driven
by trowel notch size, and notch size follows tile size. Manufacturer coverage
charts (Custom Building Products, Mapei, Laticrete) agree closely:

| Notch | Coverage per 50 lb bag | Tile size |
| --- | --- | --- |
| 1/4 × 1/4 in square | 80–100 sq ft | up to ~8 in |
| 1/4 × 3/8 in square | 60–80 sq ft | ~8–16 in |
| 1/2 × 1/2 in square | 40–50 sq ft | over ~16 in |

At 95 sq ft flat, a 24 in large-format floor was ordered with roughly **half**
the mortar it needs. Running out of thinset mid-floor is not a recoverable
mistake — the open time on the mixed batch expires.

Replaced with three bands at 90 / 70 / 45 sq ft, selected by the tile's longest
edge, each taking the middle-to-low end of its published range. The result page
names the trowel the figure assumes.

### 4. Deck fabricated structural quantities — CRITICAL (safety)

The deck planner printed beam linear footage, post count, and footing count,
derived from expressions like `length × 2`. None of those quantities can be
computed from a deck's outline. They depend on joist span, lumber species and
grade, deck height, load, soil bearing, and frost depth — none of which the
planner asks for or could reasonably ask for.

The danger was not the arithmetic being wrong. It was a plausible-looking
number, next to a dollar figure, on a page a homeowner is using to decide what
to buy. Deck collapses are overwhelmingly a framing and ledger failure.

**Removed entirely.** Beams, posts, and footings now appear only on the shopping
list, each labelled with where its size comes from ("size and span from your
structural design", "size and depth per local code and frost line"). The formula
table states `Not calculated — structural design required`, and a warning
explains why.

Guarded by "the deck planner does not quantify beams, posts, or footings", which
asserts both the absence of the material lines and the presence of the shopping
list entries — so deleting them quietly is also caught.

## Constants validated as correct

| Constant | Value | Source |
| --- | --- | --- |
| Concrete bag yield, 60 lb | 0.45 cu ft | Quikrete and Sakrete published yields |
| Concrete bag yield, 80 lb | 0.60 cu ft | Quikrete and Sakrete published yields |
| Paint coverage | 350 sq ft/gal | Figure printed on most interior latex, smooth primed wall |
| Primer coverage | 300 sq ft/gal | Lower than topcoat because it goes on raw substrate |
| Aggregate density | 100 lb/cu ft | ≈1.35 tons per cubic yard, matching published quarry figures |
| Drywall screws | 36 per sheet | Field-and-perimeter at 12 in o.c. over 16 in framing; published range 28–36 |
| Joint compound | 5 lb per sheet | Tape plus two finish coats; works out to ~395 sq ft per 4.5 gal bucket against a published ~475, so errs toward enough |
| Grout | published formula | `[(A+B) ÷ (A×B)] × C × D × 9.5` — the industry formula, using the user's real tile dimensions rather than a flat rate |
| Sod roll | 10 sq ft | Standard slab roll |
| Sod pallet | 450 sq ft | Farms run 400–500; midpoint, and editable |
| Exterior screws | 350 per 5 lb box | Retail pack size for #8 × 2-1/2 in coated deck screws |

Every one of these is surfaced to the user as an editable input or a stated
assumption. None is hidden.

## Formulas as shipped

### concrete-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Area | `Length × Width` | exact |
| Volume | `Area × (Thickness ÷ 12)` | exact |
| Cubic yards | `Cubic feet ÷ 27` | exact |
| Waste adjusted | `Calculated quantity × (1 + Waste percentage)` | exact |
| Order rounding | `Rounded up to the next 0.25 yd³` | assumption |
| Base gravel | `Area × (Base depth ÷ 12) × 1.10 compaction allowance` | assumption |

### fence-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Fence line | `2 × (Length + Width)` | exact |
| Sections | `⌈Fenced run ÷ Post spacing⌉` | exact |
| Posts | `Sections + gate posts` | exact |
| Pickets | `⌈(Fenced run × 12 × waste) ÷ (Picket width + gap)⌉` | exact |
| Post hole concrete | `π × (Hole diameter ÷ 2)² × Depth, less post volume` | assumption |

### paint-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Wall area | `2 × (Length + Width) × Ceiling height` | exact |
| Openings | `Doors × 21 sq ft + Windows × 15 sq ft` | exact |
| Paint | `(Paintable area × Coats) ÷ Coverage per gallon` | exact |
| Purchase rounding | `Rounded up to the next quart` | assumption |

### flooring-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Floor area | `Σ (Length × Width) for each area` | exact |
| Area to buy | `Floor area × (1 + Waste percentage)` | exact |
| Boxes | `⌈Area to buy ÷ Square feet per box⌉` | exact |
| Leftover | `(Boxes × Sq ft per box) − Floor area` | exact |
| Trim | `Σ 2 × (Length + Width) + 10% for cuts` | exact (fixed — see defect 1) |

### mulch-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Area | `Length × Width` | exact |
| Volume | `Area × (Depth ÷ 12)` | exact |
| Cubic yards | `Cubic feet ÷ 27` | exact |
| Bags | `⌈Adjusted cubic feet ÷ Bag size⌉` | exact |

### gravel-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Volume | `Length × Width × (Depth ÷ 12)` | exact |
| Cubic yards | `Cubic feet ÷ 27` | exact |
| Weight | `Cubic feet × 100 lb ÷ 2,000` | assumption (density varies with moisture) |
| Waste adjusted | `Volume × (1 + Waste percentage)` | exact |

### drywall-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Wall area | `2 × (Length + Width) × Ceiling height` | exact |
| Net area | `Wall area − openings + ceiling` | exact |
| Sheets | `⌈(Net area × waste) ÷ Sheet area⌉` | exact |
| Accessories | `36 screws, 5 lb compound, 12 ft tape per sheet` | assumption (tape fixed — see defect 2) |

### tile-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Area | `Length × Width` | exact |
| Tile area | `(Tile length × Tile width) ÷ 144` | exact |
| Tiles | `⌈(Area × waste) ÷ Tile area⌉` | exact |
| Grout | `[(A + B) ÷ (A × B)] × Joint width × Tile thickness × 9.5 lb/sq ft` | assumption (published formula) |
| Thinset | 90 / 70 / 45 sq ft per bag by tile size | assumption (fixed — see defect 3) |

### deck-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Deck area | `Length × Width` | exact |
| Decking rows | `⌈Length ÷ ((Board width + gap) ÷ 12)⌉` | exact |
| Decking | `Rows × Width × (1 + Waste percentage)` | exact |
| Joists | `⌊Length ÷ (Joist spacing ÷ 12)⌋ + 1` | exact |
| Beams, posts, footings | **Not calculated — structural design required** | see defect 4 |

### sod-calculator
| Step | Expression | Kind |
| --- | --- | --- |
| Area | `Σ (Length × Width) + π × (Diameter ÷ 2)² + extra area` | exact |
| Sod to buy | `Area × (1 + Waste percentage)` | exact |
| Rolls | `⌈Sod to buy ÷ Roll coverage⌉` | exact |
| Pallets | `⌈Sod to buy ÷ Pallet coverage⌉` | exact |

## Unit system

**Metric parity is exact.** `scripts/audit-calculations.mts` compares the
headline requirement in both systems across all ten planners: relative
difference 0.0000% everywhere.

Costs differ slightly in metric, and this is intended rather than a rounding
error. Bulk goods are ordered in market-specific increments — a quarter cubic
yard in the US, a tenth of a cubic metre elsewhere — so the *purchased* quantity
differs even though the requirement does not. `bulkPurchaseStep` encodes this
and the matrix test allows for it explicitly, comparing requirements exactly and
costs within 5%.

One genuine precision defect was found and fixed: the tile grout joint default
of 3/16 in rendered as `0.188` at the engine's three-decimal default, so a
US → metric → US round-trip silently changed the grout figure. Sixteenths need
four decimals, and the input now declares `precision: 4`.

## Purchase rounding

Every packaged good rounds **up**, never down, and never to a fraction. Two
matrix tests enforce this across all ten planners: one asserts whole units for
anything sold in packages, the other that the recommended quantity is never
below the calculated requirement.

Two lines were reporting quantities nobody can buy — fence at 5,538 screws and
deck at 672 fasteners. Exterior screws are sold by weight, not by the piece.
Both now report 5 lb boxes with the piece count kept in the note, matching how
drywall already handled it.

## What is deliberately *not* calculated

Naming these matters as much as the formulas, because the temptation is always
to produce a number:

- **Deck beams, posts, and footings.** Structural design. See defect 4.
- **Labour rates.** The DIY-or-hire comparison uses only the quote the user
  types in. No regional labour figures are invented.
- **Sales tax, delivery, and equipment rental.** Excluded from every total and
  now stated as excluded on both the results panel and the pack.
- **Structural adequacy or code compliance.** A cross-cutting test scans every
  material note, warning, step, FAQ, intro, and disclaimer across all ten
  planners for `code-compliant`, `meets code`, `structurally safe`,
  `engineered`, `guaranteed`, and `certified`, and fails if any appears.

## Test coverage after the audit

350 unit tests across 10 files, plus 134 E2E across two browsers.

`tests/unit/calculations.matrix.test.ts` runs every planner against eleven case
types — standard, minimum, large, waste, metric parity, unit round-trip,
package rounding (two forms), invalid input, boundary, cost integrity, and
estimate labelling — then adds cross-cutting safety guarantees that apply to all
ten at once. A new planner added tomorrow inherits every one of them without
writing a line of test code.

## Known limitations

- **Prices are planning ballparks, not live retail.** Stated on the results
  panel, in the pack, and in the price book's own docblock. Every price is an
  editable input.
- **Gravel tonnage varies with moisture and gradation.** Flagged as an estimate
  and warned about; the volume figure is the reliable one.
- **Compound quantity depends heavily on finishing level.** The result says so
  and suggests buying the first bucket and judging from there.
- **Explanation prose still mixes unit systems.** Material quantities, unit
  prices, summary rows, and notes are all correct in metric, but the narrative
  paragraphs and formula expressions still read "A 111 m² bed at 3 in deep needs
  8.50 m³". Roughly sixty strings across ten calculators; inventoried by
  `scripts/audit-metric-prose.mts` and tracked in `PRELAUNCH_AUDIT.md`.
