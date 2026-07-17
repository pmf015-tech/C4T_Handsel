import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { saveProfile } from "@/lib/db/profiles";
import {
  formatOnboardingErrors,
  OnboardingInputSchema,
} from "@/lib/profile/onboarding";

const UNAUTHENTICATED = {
  en: "Sign in before saving a profile.",
  zhHant: "請先登入，再儲存個人資料。",
} as const;

const INVALID_REQUEST = {
  en: "Check the highlighted fields and try again.",
  zhHant: "請檢查標示欄位後再試。",
} as const;

const SERVICE_UNAVAILABLE = {
  en: "Profile storage is not configured yet.",
  zhHant: "個人資料儲存服務尚未設定。",
} as const;

const INTERNAL_ERROR = {
  en: "We could not save the profile. Retry with the same details.",
  zhHant: "未能儲存資料，請用相同資料再試。",
} as const;

export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { ok: false, message: UNAUTHENTICATED, fields: {} },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, message: INVALID_REQUEST, fields: {} },
        { status: 400 },
      );
    }
    throw error;
  }

  const parsed = OnboardingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: INVALID_REQUEST,
        fields: formatOnboardingErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    const profile = await saveProfile(getDatabase(), userId, parsed.data);
    return NextResponse.json({
      ok: true,
      profile: {
        role: profile.role,
        displayName: profile.displayName,
        preferredLanguage: profile.preferredLanguage,
      },
    });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json(
        { ok: false, message: SERVICE_UNAVAILABLE, fields: {} },
        { status: 503 },
      );
    }

    const correlationId = crypto.randomUUID();
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("profile_write_failed", { correlationId, errorName });
    return NextResponse.json(
      { ok: false, message: INTERNAL_ERROR, fields: {}, correlationId },
      { status: 500 },
    );
  }
}
