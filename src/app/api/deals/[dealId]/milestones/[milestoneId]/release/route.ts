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
import {
  CreatorNotOnboardedError,
  MilestoneNotApprovedError,
  releasePayout,
} from "@/lib/stripe/payouts";

const ParamsSchema = z.object({
  dealId: z.string().uuid(),
  milestoneId: z.string().uuid(),
});

/**
 * Brand releases the escrowed payout for an APPROVED milestone
 * (manual-confirm mode — spec E4 rollback strategy).
 */
export async function POST(
  _request: Request,
  context: {
    readonly params: Promise<{ dealId: string; milestoneId: string }>;
  },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before releasing a payout." },
      { status: 401 },
    );
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });

  try {
    const sql = getDatabase();
    const parties = await sql<{ role: string; clerkUserId: string }[]>`
      select role, clerk_user_id as "clerkUserId" from deal_parties
      where deal_id = ${params.data.dealId}
    `;
    const caller = parties.find((party) => party.clerkUserId === userId);
    if (!caller) return new NextResponse(null, { status: 404 });
    if (caller.role !== "brand")
      return NextResponse.json(
        { ok: false, message: "Only the brand party releases payouts." },
        { status: 403 },
      );
    const creator = parties.find((party) => party.role === "creator");
    if (!creator)
      return NextResponse.json(
        { ok: false, message: "This deal has no creator party yet." },
        { status: 409 },
      );

    const payout = await releasePayout(sql, {
      dealId: params.data.dealId,
      milestoneId: params.data.milestoneId,
      creatorClerkUserId: creator.clerkUserId,
      actorClerkUserId: userId,
    });
    return NextResponse.json({ ok: true, state: payout.state });
  } catch (error: unknown) {
    if (error instanceof PayoutNotFoundError)
      return new NextResponse(null, { status: 404 });
    if (
      error instanceof InvalidPayoutTransitionError ||
      error instanceof PayoutRetryLimitError ||
      error instanceof MilestoneNotApprovedError ||
      error instanceof CreatorNotOnboardedError
    )
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
