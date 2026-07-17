import { decimalInputOrNull } from "./numeric-input";

type Role = "creator" | "brand";
type Language = "en" | "zh-Hant";

export type OnboardingBrowserDraft = {
  readonly role: Role;
  readonly displayName: string;
  readonly language: Language;
  readonly niche: string;
  readonly followerCount: string;
  readonly engagementRate: string;
  readonly social: string;
  readonly productCategory: string;
  readonly website: string;
};

export type OnboardingBrowserPayload =
  | {
      readonly role: "creator";
      readonly displayName: string;
      readonly niche: string;
      readonly followerCount: number | null;
      readonly engagementRateBasisPoints: number | null;
      readonly socials: readonly string[];
      readonly preferredLanguage: Language;
    }
  | {
      readonly role: "brand";
      readonly displayName: string;
      readonly productCategory: string;
      readonly website: string;
      readonly preferredLanguage: Language;
    };

class InvalidBrowserRoleError extends Error {
  readonly name = "InvalidBrowserRoleError";

  constructor() {
    super("Browser role is outside the supported onboarding domain");
  }
}

function assertNever(_value: never): never {
  throw new InvalidBrowserRoleError();
}

export function createOnboardingPayload(
  draft: OnboardingBrowserDraft,
): OnboardingBrowserPayload {
  switch (draft.role) {
    case "creator": {
      const engagementPercent = decimalInputOrNull(draft.engagementRate);
      return {
        role: draft.role,
        displayName: draft.displayName,
        niche: draft.niche,
        followerCount: decimalInputOrNull(draft.followerCount),
        engagementRateBasisPoints:
          engagementPercent === null
            ? null
            : Math.round(engagementPercent * 100),
        socials: draft.social ? [draft.social] : [],
        preferredLanguage: draft.language,
      };
    }
    case "brand":
      return {
        role: draft.role,
        displayName: draft.displayName,
        productCategory: draft.productCategory,
        website: draft.website,
        preferredLanguage: draft.language,
      };
    default:
      return assertNever(draft.role);
  }
}
