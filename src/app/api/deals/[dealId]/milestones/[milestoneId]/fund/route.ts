import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  InvalidPayoutTransitionError,
  PayoutRetryLimitError,
} from "@/domain/payout/payout";
import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { PayoutNotFoundError } from "@/lib/db/payouts";
import { StripeConfigurationError } from "@/lib/stripe/client";
import { fundMilestone } from "@/lib/stripe/payouts";

const ParamsSchema = z.object({
  dealId: z.string().uuid(),
  milestoneId: z.string().uuid(),
});

/** Brand funds a milestone into escrow (spec E4). Returns a PaymentIntent client secret. */
export async function POST(
  _request: Request,
  context: {
    readonly params: Promise<{ dealId: string; milestoneId: string }>;
  },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before funding a milestone." },
      { status: 401 },
    );
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });

  try {
    const sql = getDatabase();
    const partyRows = await sql`
      select role from deal_parties
      where deal_id = ${params.data.dealId} and clerk_user_id = ${userId}
      limit 1
    `;
    // 404 (not 403) so non-parties cannot confirm the deal exists.
    if (!partyRows[0]) return new NextResponse(null, { status: 404 });
    if (partyRows[0].role !== "brand")
      return NextResponse.json(
        { ok: false, message: "Only the brand party funds milestones." },
        { status: 403 },
      );

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(_request.url).origin;
    const dealUrl = `${origin}/deals/${params.data.dealId}`;
    const { url, payoutId } = await fundMilestone(sql, {
      dealId: params.data.dealId,
      milestoneId: params.data.milestoneId,
      actorClerkUserId: userId,
      successUrl: `${dealUrl}?funded=1`,
      cancelUrl: `${dealUrl}?funded=0`,
    });
    return NextResponse.json({ ok: true, url, payoutId });
  } catch (error: unknown) {
    if (error instanceof PayoutNotFoundError)
      return new NextResponse(null, { status: 404 });
    if (error instanceof InvalidPayoutTransitionError)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 409 },
      );
    if (error instanceof PayoutRetryLimitError)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 409 },
      );
    if (
      error instanceof DatabaseConfigurationError ||
      error instanceof StripeConfigurationError
    )
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 503 },
      );
    throw error;
  }
}
