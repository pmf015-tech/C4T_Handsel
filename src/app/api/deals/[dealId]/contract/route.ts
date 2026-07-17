import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { createContractVersion } from "@/lib/db/contracts";

const ParamsSchema = z.object({ dealId: z.string().uuid() });

export async function POST(
  _request: Request,
  context: { readonly params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before creating a contract." },
      { status: 401 },
    );
  const parsed = ParamsSchema.safeParse(await context.params);
  if (!parsed.success) return new NextResponse(null, { status: 404 });
  try {
    const contract = await createContractVersion(
      getDatabase(),
      parsed.data.dealId,
      userId,
    );
    if (!contract) return new NextResponse(null, { status: 404 });
    return NextResponse.json({ ok: true, contract });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Contract storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
