import { describe, expect, it } from "vitest";

import { PublicDealSchema, PublicProfileSchema } from "./public-profiles";

/**
 * Spec E5 acceptance criterion 1: the public page contains ONLY public-class
 * fields — asserted against the projection schema, not the UI.
 */

const FORBIDDEN_FIELD_PATTERN =
  /amount|minor|revenue|share|basis|email|clerk|token|hash|stripe/i;

describe("public projection schemas", () => {
  it("PublicDealSchema exposes no money, identity, or secret fields", () => {
    for (const key of Object.keys(PublicDealSchema.shape)) {
      expect(key).not.toMatch(FORBIDDEN_FIELD_PATTERN);
    }
  });

  it("PublicProfileSchema exposes no money, identity, or secret fields", () => {
    for (const key of Object.keys(PublicProfileSchema.shape)) {
      expect(key).not.toMatch(FORBIDDEN_FIELD_PATTERN);
    }
  });

  it("rejects rows that carry extra private fields", () => {
    const parsed = PublicDealSchema.safeParse({
      id: "0b40d9b2-64f5-4bd9-9d2c-05b9d0a1c8aa",
      title: "Glow Ritual",
      state: "SIGNED",
      counterpartyDisplayName: "Brightside",
      milestonesTotal: 5,
      milestonesApproved: 2,
      createdAt: new Date().toISOString(),
      amountMinorUnits: 750_000,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect("amountMinorUnits" in parsed.data).toBe(false);
  });
});
