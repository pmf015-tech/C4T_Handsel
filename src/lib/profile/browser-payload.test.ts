import { describe, expect, it } from "vitest";

import { createOnboardingPayload } from "./browser-payload";

describe("Given an onboarding browser draft", () => {
  it("then serializes creator metrics without turning blanks into zero", () => {
    const payload = createOnboardingPayload({
      role: "creator",
      displayName: "Kaia Chen",
      language: "en",
      niche: "Skincare",
      followerCount: "",
      engagementRate: "",
      social: "",
      productCategory: "",
      website: "",
    });

    expect(payload).toMatchObject({
      role: "creator",
      followerCount: null,
      engagementRateBasisPoints: null,
      socials: [],
    });
    expect(payload).not.toHaveProperty("productCategory");
  });

  it("then excludes creator-only fields from a brand payload", () => {
    const payload = createOnboardingPayload({
      role: "brand",
      displayName: "Brightside Brands",
      language: "zh-Hant",
      niche: "",
      followerCount: "",
      engagementRate: "",
      social: "",
      productCategory: "Skincare",
      website: "https://brightside.example",
    });

    expect(payload).toEqual({
      role: "brand",
      displayName: "Brightside Brands",
      productCategory: "Skincare",
      website: "https://brightside.example",
      preferredLanguage: "zh-Hant",
    });
  });
});
