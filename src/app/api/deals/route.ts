import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { saveDealDraft } from "@/lib/db/deals";
import { CreateDealInputSchema, formatDealErrors } from "@/lib/deals/input";

const INVALID_REQUEST = {
  en: "Check the highlighted deal fields and try again.",
  zhHant: "請檢查標示嘅合作欄位後再試。",
} as const;

export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        message: {
          en: "Sign in before creating a deal.",
          zhHant: "請先登入，再建立合作。",
        },
        fields: {},
      },
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

  const parsed = CreateDealInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: INVALID_REQUEST,
        fields: formatDealErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    const draft = await saveDealDraft(getDatabase(), userId, parsed.data);
    return NextResponse.json(
      { ok: true, deal: { id: draft.id, state: draft.state } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json(
        {
          ok: false,
          message: {
            en: "Deal storage is not configured yet.",
            zhHant: "合作儲存服務尚未設定。",
          },
          fields: {},
        },
        { status: 503 },
      );
    }
    const correlationId = crypto.randomUUID();
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("deal_draft_write_failed", { correlationId, errorName });
    return NextResponse.json(
      {
        ok: false,
        message: {
          en: "We could not save this deal draft.",
          zhHant: "未能儲存合作草稿，請再試。",
        },
        fields: {},
        correlationId,
      },
      { status: 500 },
    );
  }
}
