import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { setDealVisibility } from "@/lib/db/public-profiles";

const ParamsSchema = z.object({ dealId: z.string().uuid() });
const BodySchema = z.object({ isPublic: z.boolean() });

/** E5: either party can opt a deal out of (or back into) public history. */
export async function PATCH(
  request: Request,
  context: { readonly params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in first." },
      { status: 401 },
    );
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });
  const body = BodySchema.safeParse(await request.json());
  if (!body.success)
    return NextResponse.json(
      { ok: false, message: "Provide isPublic as a boolean." },
      { status: 400 },
    );

  try {
    const updated = await setDealVisibility(
      getDatabase(),
      params.data.dealId,
      userId,
      body.data.isPublic,
    );
    // 404 for non-parties: no existence leak (spec E5 acceptance criterion 2).
    if (!updated) return new NextResponse(null, { status: 404 });
    return NextResponse.json({ ok: true, isPublic: body.data.isPublic });
  } catch (error: unknown) {
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 503 },
      );
    throw error;
  }
}
