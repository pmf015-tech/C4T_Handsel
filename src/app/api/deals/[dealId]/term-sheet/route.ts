import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { createTermSheetVersion } from "@/lib/db/deals";

const ParamsSchema = z.object({ dealId: z.string().uuid() });

export async function POST(
  _request: Request,
  context: { readonly params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { ok: false, message: "Sign in before generating a term sheet." },
      { status: 401 },
    );
  }
  const parsed = ParamsSchema.safeParse(await context.params);
  if (!parsed.success) return new NextResponse(null, { status: 404 });

  try {
    const version = await createTermSheetVersion(
      getDatabase(),
      parsed.data.dealId,
      userId,
    );
    if (!version) return new NextResponse(null, { status: 404 });
    return NextResponse.json({
      ok: true,
      termSheet: {
        versionNumber: version.versionNumber,
        sharePath: `/s/${version.shareToken}`,
        expiresAt: version.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json(
        { ok: false, message: "Term-sheet storage is not configured." },
        { status: 503 },
      );
    }
    const correlationId = crypto.randomUUID();
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("term_sheet_generation_failed", { correlationId, errorName });
    return NextResponse.json(
      {
        ok: false,
        message: "We could not generate this term sheet.",
        correlationId,
      },
      { status: 500 },
    );
  }
}
