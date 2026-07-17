import { describe, expect, it } from "vitest";

import { DealRevisionLockedError, assertDealTermsRevisable } from "./revision";

describe("assertDealTermsRevisable", () => {
  it("allows a revision while the deal is still DRAFT", () => {
    expect(() => assertDealTermsRevisable("DRAFT", ["PENDING"])).not.toThrow();
  });

  it("allows a revision while negotiating", () => {
    expect(() =>
      assertDealTermsRevisable("NEGOTIATING", ["PENDING", "PENDING"]),
    ).not.toThrow();
  });

  it("allows a revision after signing but before funding (redline loop)", () => {
    expect(() => assertDealTermsRevisable("SIGNED", ["PENDING"])).not.toThrow();
  });

  it("rejects a revision once the deal is ACTIVE (terms are funded)", () => {
    expect(() => assertDealTermsRevisable("ACTIVE", ["PENDING"])).toThrow(
      DealRevisionLockedError,
    );
  });

  it("rejects a revision when the deal is in dispute", () => {
    expect(() => assertDealTermsRevisable("DISPUTED", ["PENDING"])).toThrow(
      DealRevisionLockedError,
    );
  });

  it("rejects a revision on a cancelled deal", () => {
    expect(() => assertDealTermsRevisable("CANCELLED", ["PENDING"])).toThrow(
      DealRevisionLockedError,
    );
  });

  it("rejects a revision once any milestone has been delivered", () => {
    expect(() =>
      assertDealTermsRevisable("SIGNED", ["PENDING", "DELIVERED"]),
    ).toThrow(DealRevisionLockedError);
  });

  it("rejects a revision once any milestone has been approved", () => {
    expect(() => assertDealTermsRevisable("SIGNED", ["APPROVED"])).toThrow(
      DealRevisionLockedError,
    );
  });

  it("rejects a revision while a milestone is frozen", () => {
    expect(() => assertDealTermsRevisable("SIGNED", ["FROZEN"])).toThrow(
      DealRevisionLockedError,
    );
  });

  it("allows a revision on a deal with no milestones yet", () => {
    expect(() => assertDealTermsRevisable("DRAFT", [])).not.toThrow();
  });
});
