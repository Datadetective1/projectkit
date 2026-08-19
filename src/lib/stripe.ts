import "server-only";

import Stripe from "stripe";

/**
 * Stripe is entirely optional.
 *
 * Nothing in ProjectKit requires it — the planners, the shopping list, and the
 * Project Pack preview all work without a key. When a key is absent the
 * checkout endpoints say so plainly instead of failing in a confusing way.
 *
 * Only test-mode keys (`sk_test_…`) are accepted unless live mode is explicitly
 * enabled, so a stray production key cannot start charging people by accident.
 */

let cached: Stripe | undefined;

export function isLiveKey(key: string): boolean {
  return key.startsWith("sk_live_");
}

/**
 * Whether the free-unlock escape hatch may be honoured.
 *
 * `NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK` is baked into the client bundle at
 * build time and is therefore trivially visible; it is a convenience for local
 * work and preview demos, not a security boundary. This is the boundary: the
 * server refuses to grant a free unlock on a production deployment no matter
 * what the build-time flag says.
 *
 * `VERCEL_ENV` is server-only and set by the platform to production, preview,
 * or development. Outside Vercel it is absent, which is the local case.
 */
export function devUnlockAllowed(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

export function stripeEnabled(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return false;
  if (isLiveKey(key) && process.env.STRIPE_ALLOW_LIVE_MODE !== "true") return false;
  return true;
}

export function getStripe(): Stripe | undefined {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !stripeEnabled()) return undefined;
  if (!cached) {
    cached = new Stripe(key, { typescript: true });
  }
  return cached;
}

/** Human-readable reason the checkout endpoint is unavailable, if it is. */
export function stripeUnavailableReason(): string | undefined {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return "Payments are not configured on this deployment yet.";
  }
  if (isLiveKey(key) && process.env.STRIPE_ALLOW_LIVE_MODE !== "true") {
    return "A live Stripe key is present but live mode has not been enabled on this deployment.";
  }
  return undefined;
}
