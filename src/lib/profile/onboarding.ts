import { z } from "zod";

const ERROR_MESSAGES = {
  unexpected_field: {
    en: "Remove fields that do not belong to the selected role.",
    zhHant: "請移除唔屬於所選身份嘅欄位。",
  },
  plain_text: {
    en: "Use plain text without angle brackets.",
    zhHant: "請使用純文字，唔好輸入尖括號。",
  },
  follower_count_number: {
    en: "Follower count must be a number.",
    zhHant: "追蹤人數必須係數字。",
  },
  follower_count_integer: {
    en: "Follower count must be a whole number.",
    zhHant: "追蹤人數必須係整數。",
  },
  engagement_rate_max: {
    en: "Engagement rate cannot exceed 100%.",
    zhHant: "互動率唔可以超過 100%。",
  },
  web_url: {
    en: "Enter an HTTP or HTTPS URL no longer than 2,048 characters.",
    zhHant: "請輸入不多於 2,048 字元嘅 HTTP 或 HTTPS 網址。",
  },
  invalid_field: {
    en: "Check this field and try again.",
    zhHant: "請檢查呢個欄位後再試。",
  },
} as const;

const plainText = z
  .string()
  .trim()
  .min(2, "invalid_field")
  .max(46, "invalid_field")
  .refine((value) => !/[<>]/.test(value), "plain_text");

function isWebUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}

const webUrl = z
  .string()
  .trim()
  .max(2_048, "web_url")
  .refine(isWebUrl, "web_url");

const creatorSchema = z
  .object({
    role: z.literal("creator"),
    displayName: plainText,
    niche: plainText,
    followerCount: z
      .number({ invalid_type_error: "follower_count_number" })
      .int("follower_count_integer")
      .min(0, "invalid_field")
      .max(500_000_000, "invalid_field"),
    engagementRateBasisPoints: z
      .number({ invalid_type_error: "invalid_field" })
      .int("invalid_field")
      .min(0, "invalid_field")
      .max(10_000, "engagement_rate_max"),
    socials: z.array(webUrl).max(10, "invalid_field"),
    preferredLanguage: z.union([z.literal("en"), z.literal("zh-Hant")]),
  })
  .strict("unexpected_field");

const brandSchema = z
  .object({
    role: z.literal("brand"),
    displayName: plainText,
    productCategory: plainText,
    website: webUrl,
    preferredLanguage: z.union([z.literal("en"), z.literal("zh-Hant")]),
  })
  .strict("unexpected_field");

export const OnboardingInputSchema = z.discriminatedUnion("role", [
  creatorSchema,
  brandSchema,
]);

export type OnboardingInput = Readonly<z.infer<typeof OnboardingInputSchema>>;

export type BilingualFieldMessage = {
  readonly en: string;
  readonly zhHant: string;
};

export type OnboardingFieldErrors = Readonly<
  Record<string, BilingualFieldMessage>
>;

export const OnboardingApiResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    profile: z.object({
      role: z.union([z.literal("creator"), z.literal("brand")]),
      displayName: z.string(),
      preferredLanguage: z.union([z.literal("en"), z.literal("zh-Hant")]),
    }),
  }),
  z.object({
    ok: z.literal(false),
    message: z.object({
      en: z.string(),
      zhHant: z.string(),
    }),
    fields: z.record(
      z.object({
        en: z.string(),
        zhHant: z.string(),
      }),
    ),
    correlationId: z.string().uuid().optional(),
  }),
]);

function isErrorMessageKey(
  value: string,
): value is keyof typeof ERROR_MESSAGES {
  return Object.hasOwn(ERROR_MESSAGES, value);
}

export function formatOnboardingErrors(
  error: z.ZodError,
): OnboardingFieldErrors {
  const fields: Record<string, BilingualFieldMessage> = {};

  for (const issue of error.issues) {
    const pathHead = issue.path[0];
    const field = typeof pathHead === "string" ? pathHead : "_form";
    if (fields[field]) continue;

    fields[field] = isErrorMessageKey(issue.message)
      ? ERROR_MESSAGES[issue.message]
      : ERROR_MESSAGES.invalid_field;
  }

  return fields;
}
