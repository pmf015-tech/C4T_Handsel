import { describe, expect, it } from "vitest";

import { formatOnboardingErrors, OnboardingInputSchema } from "./onboarding";

describe("Given a creator onboarding payload", () => {
  it("then parses integer profile metrics when every field is valid", () => {
    const result = OnboardingInputSchema.safeParse({
      role: "creator",
      displayName: "Kaia Chen",
      niche: "Skincare",
      followerCount: 96_200,
      engagementRateBasisPoints: 425,
      socials: ["https://instagram.com/kaia"],
      preferredLanguage: "zh-Hant",
    });

    expect(result.success).toBe(true);
  });

  it("then returns bilingual field errors when metrics are malformed", () => {
    const result = OnboardingInputSchema.safeParse({
      role: "creator",
      displayName: "<script>alert(1)</script>",
      niche: "Skincare",
      followerCount: 12.5,
      engagementRateBasisPoints: 10_001,
      socials: [],
      preferredLanguage: "en",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(formatOnboardingErrors(result.error)).toMatchObject({
      displayName: {
        en: "Use plain text without angle brackets.",
        zhHant: "請使用純文字，唔好輸入尖括號。",
      },
      followerCount: {
        en: "Follower count must be a whole number.",
        zhHant: "追蹤人數必須係整數。",
      },
      engagementRateBasisPoints: {
        en: "Engagement rate cannot exceed 100%.",
        zhHant: "互動率唔可以超過 100%。",
      },
    });
  });
});

describe("Given a brand onboarding payload", () => {
  it("then rejects creator-only fields when the role is brand", () => {
    const result = OnboardingInputSchema.safeParse({
      role: "brand",
      displayName: "Brightside Brands",
      productCategory: "Skincare",
      website: "https://brightside.example",
      preferredLanguage: "en",
      followerCount: 20_000,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(formatOnboardingErrors(result.error)).toHaveProperty("_form");
  });

  it("then rejects non-web and oversized website URLs", () => {
    const unsafe = OnboardingInputSchema.safeParse({
      role: "brand",
      displayName: "Brightside Brands",
      productCategory: "Skincare",
      website: "javascript:alert(1)",
      preferredLanguage: "en",
    });
    const oversized = OnboardingInputSchema.safeParse({
      role: "brand",
      displayName: "Brightside Brands",
      productCategory: "Skincare",
      website: `https://example.com/${"a".repeat(2_100)}`,
      preferredLanguage: "en",
    });

    expect(unsafe.success).toBe(false);
    expect(oversized.success).toBe(false);
  });
});
