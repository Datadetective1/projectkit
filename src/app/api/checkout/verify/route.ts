import { NextResponse } from "next/server";
import { features } from "@/config/site";
import { devUnlockAllowed, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_PATTERN = /^cs_[A-Za-z0-9_]+$/;

/**
 * Confirms a completed Checkout session so the browser can record the unlock.
 *
 * The client is never trusted to decide it has paid — it hands over a session
 * id and Stripe is the authority on whether that session is actually paid.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") ?? "";

  if (!SESSION_PATTERN.test(sessionId)) {
    return NextResponse.json({ paid: false, error: "Invalid session." }, { status: 400 });
  }

  // Production never honours the build-time dev flag; see lib/stripe.ts.
  if (features.projectPackDevUnlock && devUnlockAllowed()) {
    return NextResponse.json({ paid: true, devUnlock: true });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ paid: false, error: "Payments unavailable." }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.status === "complete";
    return NextResponse.json({
      paid,
      projectId: typeof session.client_reference_id === "string" ? session.client_reference_id : null,
    });
  } catch {
    return NextResponse.json({ paid: false, error: "Could not verify session." }, { status: 502 });
  }
}
