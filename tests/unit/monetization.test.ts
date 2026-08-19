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

describe("free-during-beta", () => {
  /**
   * Deliberately separate from the dev unlock. That one is a convenience the
   * server refuses in production; this is a stated product decision and is
   * honoured everywhere. Keeping them apart means "free during beta" never has
   * to be expressed by leaving a development flag switched on — which is
   * exactly how the paid product got given away by accident before.
   */

  it("is off unless explicitly turned on", async () => {
    for (const value of [undefined, "false", "1", "yes", "TRUE", ""]) {
      const features = await featuresWith({ NEXT_PUBLIC_PROJECT_PACK_FREE: value });
      expect(features.projectPackFree, String(value)).toBe(false);
    }
  });

  it("is on when explicitly turned on", async () => {
    const features = await featuresWith({ NEXT_PUBLIC_PROJECT_PACK_FREE: "true" });
    expect(features.projectPackFree).toBe(true);
  });

  it("resolves one access mode rather than leaving it to each caller", async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NEXT_PUBLIC_PROJECT_PACK_FREE: "true" };
    const free = await import("@/config/site");
    expect(free.packAccess(true)).toBe("free");
    expect(free.packAccess(false)).toBe("free");

    vi.resetModules();
    process.env = { ...ORIGINAL, NEXT_PUBLIC_PROJECT_PACK_FREE: undefined };
    const paid = await import("@/config/site");
    expect(paid.packAccess(true)).toBe("paid");
    // Not "free": with neither Stripe nor the flag, the pack is unavailable.
    expect(paid.packAccess(false)).toBe("unavailable");
  });
});

describe("configuration defaults", () => {
  it("never lets a malformed price reach Stripe", async () => {
    // Number("") is 0 and Number("abc") is NaN; both used to travel straight
    // into the checkout line item.
    for (const value of ["abc", "", "-100", "0", undefined]) {
      vi.resetModules();
      process.env = { ...ORIGINAL, NEXT_PUBLIC_PROJECT_PACK_PRICE_CENTS: value };
      const { projectPack } = await import("@/config/site");
      expect(Number.isInteger(projectPack.priceCents), String(value)).toBe(true);
      expect(projectPack.priceCents, String(value)).toBeGreaterThan(0);
    }
  });

  it("honours a valid price override", async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NEXT_PUBLIC_PROJECT_PACK_PRICE_CENTS: "1299" };
    const { projectPack } = await import("@/config/site");
    expect(projectPack.priceCents).toBe(1299);
  });

  it("identifies the build so a bug report can name one", async () => {
    vi.resetModules();
    process.env = {
      ...ORIGINAL,
      NEXT_PUBLIC_BUILD_ID: undefined,
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "2f724477d434f0b112be76c76cdf8d65c674aa52",
    };
    const { build } = await import("@/config/site");
    expect(build.id).toBe("2f72447");

    vi.resetModules();
    process.env = {
      ...ORIGINAL,
      NEXT_PUBLIC_BUILD_ID: undefined,
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: undefined,
    };
    expect((await import("@/config/site")).build.id).toBe("dev");
  });

  it("shows the beta label unless explicitly switched off", async () => {
    // The only flag here that fails open, because the risk runs the other way:
    // saying "beta" when you are not costs nothing.
    for (const value of [undefined, "", "true"]) {
      const features = await featuresWith({ NEXT_PUBLIC_BETA: value });
      expect(features.beta, String(value)).toBe(true);
    }
    expect((await featuresWith({ NEXT_PUBLIC_BETA: "false" })).beta).toBe(false);
  });
});
