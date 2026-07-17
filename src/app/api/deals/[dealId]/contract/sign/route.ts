import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ContractExpiredError,
  ContractHashMismatchError,
} from "@/domain/contract/contract";
import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { ContractNotFoundError, signContract } from "@/lib/db/contracts";

const ParamsSchema = z.object({ dealId: z.string().uuid() });
const BodySchema = z.object({
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before signing." },
      { status: 401 },
    );
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });
  const body = BodySchema.safeParse(await request.json());
  if (!body.success)
    return NextResponse.json(
      { ok: false, message: "Review the contract hash before signing." },
      { status: 400 },
    );
  try {
    const contract = await signContract(
      getDatabase(),
      params.data.dealId,
      userId,
      body.data.contentHash,
    );
    return NextResponse.json({ ok: true, contract });
  } catch (error) {
    if (error instanceof ContractNotFoundError)
      return new NextResponse(null, { status: 404 });
    if (error instanceof ContractHashMismatchError)
      return NextResponse.json(
        {
          ok: false,
          message: "Terms changed; review the latest contract version.",
          currentHash: error.currentHash,
        },
        { status: 409 },
      );
    if (error instanceof ContractExpiredError)
      return NextResponse.json(
        { ok: false, message: "The signing window has expired." },
        { status: 410 },
      );
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Contract storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
