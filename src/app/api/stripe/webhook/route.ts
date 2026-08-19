import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver.
 *
 * ProjectKit has no accounts and no server-side order table, so this endpoint
 * exists to verify signatures and log fulfilment — the actual unlock is granted
 * in the browser after `/api/checkout/verify` confirms the session with Stripe.
 * The extension point is here for when accounts arrive.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return NextResponse.json({ received: false }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  let event;
  try {
    // The raw body is required — parsing it first would invalidate the signature.
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // Fulfilment happens client-side against the verified session. When
      // accounts exist, record the entitlement here instead.
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
