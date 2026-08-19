import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The Project Pack is the only thing ProjectKit charges for, and its free-unlock
 * escape hatch is a build-time environment flag. A flag that fails *open* gives
 * the product away silently — the site looks perfectly healthy while earning
 * nothing — so these tests pin the direction it fails in.
 */

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

async function featuresWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...ORIGINAL, ...env };
  return (await import("@/config/site")).features;
}

async function stripeWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...ORIGINAL, ...env };
  return import("@/lib/stripe");
}

describe("the Project Pack dev unlock", () => {
  it("is off when the flag is absent", async () => {
    const features = await featuresWith({ NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK: undefined });
    expect(features.projectPackDevUnlock).toBe(false);
  });

  it("is off for every value other than an explicit \"true\"", async () => {
    for (const value of ["false", "1", "yes", "TRUE", "", "  true  "]) {
      const features = await featuresWith({ NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK: value });
      expect(features.projectPackDevUnlock, value).toBe(false);
    }
  });

  it("is on only when explicitly opted into", async () => {
    const features = await featuresWith({ NEXT_PUBLIC_PROJECT_PACK_DEV_UNLOCK: "true" });
    expect(features.projectPackDevUnlock).toBe(true);
  });

  // Generous timeout: this is the first test to pull in lib/stripe.ts, and the
  // Stripe SDK's cold import alone runs past the 5s default.
  it("is refused on a production deployment whatever the build flag said", async () => {
    const { devUnlockAllowed } = await stripeWith({ VERCEL_ENV: "production" });
    expect(devUnlockAllowed()).toBe(false);
  }, 30_000);

  it("is allowed on preview and local, where demos need it", async () => {
    for (const env of ["preview", "development", undefined]) {
      const { devUnlockAllowed } = await stripeWith({ VERCEL_ENV: env });
      expect(devUnlockAllowed(), String(env)).toBe(true);
    }
  });
});

describe("Stripe mode safety", () => {
  it("refuses a live key unless live mode is explicitly enabled", async () => {
    const { stripeEnabled, stripeUnavailableReason } = await stripeWith({
      STRIPE_SECRET_KEY: "sk_live_notarealkey",
      STRIPE_ALLOW_LIVE_MODE: undefined,
    });

    expect(stripeEnabled()).toBe(false);
    expect(stripeUnavailableReason()).toMatch(/live mode has not been enabled/i);
  });

  it("accepts a test key without any extra opt-in", async () => {
    const { stripeEnabled, stripeUnavailableReason } = await stripeWith({
      STRIPE_SECRET_KEY: "sk_test_notarealkey",
    });

    expect(stripeEnabled()).toBe(true);
    expect(stripeUnavailableReason()).toBeUndefined();
  });

  it("says so plainly when no key is configured at all", async () => {
    const { stripeEnabled, getStripe, stripeUnavailableReason } = await stripeWith({
      STRIPE_SECRET_KEY: undefined,
    });

    expect(stripeEnabled()).toBe(false);
    expect(getStripe()).toBeUndefined();
    expect(stripeUnavailableReason()).toMatch(/not configured/i);
  });
});
