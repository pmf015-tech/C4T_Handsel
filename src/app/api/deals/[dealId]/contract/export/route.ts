import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { exportContractAudit } from "@/lib/db/contracts";

const ParamsSchema = z.object({ dealId: z.string().uuid() });

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return new NextResponse(null, { status: 401 });
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });
  try {
    const audit = await exportContractAudit(
      getDatabase(),
      params.data.dealId,
      userId,
    );
    if (!audit) return new NextResponse(null, { status: 404 });
    return new NextResponse(
      JSON.stringify({ exportedAt: new Date().toISOString(), ...audit }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="handsel-contract-${params.data.dealId}.json"`,
        },
      },
    );
  } catch (error) {
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Contract storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
