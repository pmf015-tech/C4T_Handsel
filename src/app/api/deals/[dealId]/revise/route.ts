import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { InvalidDealDraftError } from "@/domain/deal/builder";
import { DealRevisionLockedError } from "@/domain/deal/revision";
import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { RedlineHashUnchangedError } from "@/lib/db/contracts";
import { DealRevisionNotFoundError, reviseDealTerms } from "@/lib/db/revisions";
import { CreateDealInputSchema } from "@/lib/deals/input";

const ParamsSchema = z.object({ dealId: z.string().uuid() });

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before revising terms." },
      { status: 401 },
    );
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });
  const body = CreateDealInputSchema.safeParse(await request.json());
  if (!body.success)
    return NextResponse.json(
      { ok: false, message: body.error.issues[0]?.message ?? "Invalid terms." },
      { status: 400 },
    );
  try {
    const contract = await reviseDealTerms(
      getDatabase(),
      params.data.dealId,
      userId,
      body.data,
    );
    return NextResponse.json({ ok: true, contract });
  } catch (error) {
    // A non-party and an unknown deal are indistinguishable by design.
    if (error instanceof DealRevisionNotFoundError)
      return new NextResponse(null, { status: 404 });
    if (error instanceof DealRevisionLockedError)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 409 },
      );
    if (error instanceof RedlineHashUnchangedError)
      return NextResponse.json(
        { ok: false, message: "A revision must change the terms." },
        { status: 409 },
      );
    if (error instanceof InvalidDealDraftError)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Deal storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
