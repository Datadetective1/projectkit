import { NextResponse } from "next/server";
import { features, projectPack, site } from "@/config/site";
import { getStripe, stripeUnavailableReason } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Saved-project ids are UUIDs or our own `pk_…` fallback — nothing else. */
const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export async function POST(request: Request) {
  let projectId = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object") {
      const value = (body as { projectId?: unknown }).projectId;
      if (typeof value === "string") projectId = value;
    }
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!ID_PATTERN.test(projectId)) {
    return NextResponse.json({ error: "Invalid project reference." }, { status: 400 });
  }

  // Local and preview builds unlock without touching Stripe at all.
  if (features.projectPackDevUnlock) {
    return NextResponse.json({ devUnlock: true });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: stripeUnavailableReason() ?? "Payments are unavailable." },
      { status: 503 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // The pack itself lives in the buyer's browser; we only need the id back.
      client_reference_id: projectId,
      metadata: { projectId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: projectPack.currency,
            unit_amount: projectPack.priceCents,
            product_data: {
              name: projectPack.name,
              description:
                "Printable PDF of your project plan: quantities, budget, shopping list, assumptions, and project sequence.",
            },
          },
        },
      ],
      success_url: `${site.url}/project-pack/${projectId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site.url}/project-pack/${projectId}?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch {
    // Never leak Stripe's internal error text to the browser.
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
