import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import {
  ContractNotFoundError,
  RedlineHashUnchangedError,
  createRedlineVersion,
} from "@/lib/db/contracts";

const ParamsSchema = z.object({ dealId: z.string().uuid() });
const BodySchema = z.object({ termSheetVersionId: z.string().uuid() });

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before requesting a revision." },
      { status: 401 },
    );
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });
  const body = BodySchema.safeParse(await request.json());
  if (!body.success)
    return NextResponse.json(
      { ok: false, message: "Choose a valid term-sheet version." },
      { status: 400 },
    );
  try {
    const contract = await createRedlineVersion(
      getDatabase(),
      params.data.dealId,
      userId,
      body.data.termSheetVersionId,
    );
    return NextResponse.json({ ok: true, contract });
  } catch (error) {
    if (error instanceof ContractNotFoundError)
      return new NextResponse(null, { status: 404 });
    if (error instanceof RedlineHashUnchangedError)
      return NextResponse.json(
        { ok: false, message: "A revision must change the terms." },
        { status: 409 },
      );
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Contract storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
