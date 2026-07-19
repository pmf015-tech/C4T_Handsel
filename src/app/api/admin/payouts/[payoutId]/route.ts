import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { lockPayoutById } from "@/lib/db/payouts";

const ParamsSchema = z.object({ payoutId: z.string().uuid() });
const BodySchema = z.object({ action: z.literal("resolve") });

/**
 * E7 admin queue action: mark a failed money operation resolved.
 * Resets the payout to its last safe state and clears the attempt counter so
 * the normal party-facing retry path works again. Event-logged; no DB is ever
 * hand-edited outside this audited path.
 */
export async function POST(
  request: Request,
  context: { readonly params: Promise<{ payoutId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!isAdmin(userId ?? null)) return new NextResponse(null, { status: 404 });
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });
  const body = BodySchema.safeParse(await request.json());
  if (!body.success)
    return NextResponse.json(
      { ok: false, message: "Unsupported admin action." },
      { status: 400 },
    );

  try {
    const sql = getDatabase();
    const result = await sql.begin(async (transaction) => {
      const payout = await lockPayoutById(transaction, params.data.payoutId);
      if (!payout) return null;
      if (
        payout.state !== "FUNDING_FAILED" &&
        payout.state !== "RELEASE_FAILED"
      )
        return { payout, changed: false };

      const nextState =
        payout.state === "FUNDING_FAILED" ? "NOT_FUNDED" : "FUNDED";
      await transaction`
        update milestone_payouts set
          state = ${nextState},
          failure_class = null,
          funding_attempts = case when ${nextState} = 'NOT_FUNDED' then 0 else funding_attempts end,
          release_attempts = case when ${nextState} = 'FUNDED' then 0 else release_attempts end,
          updated_at = now()
        where id = ${payout.id}
      `;
      await transaction`
        insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
        values (
          ${randomUUID()}, ${payout.dealId}, 'ADMIN_PAYOUT_RESOLVED',
          ${userId}, ${transaction.json({
            payoutId: payout.id,
            fromState: payout.state,
            toState: nextState,
            failureClass: payout.failureClass,
          })}
        )
      `;
      return { payout, changed: true };
    });

    if (!result) return new NextResponse(null, { status: 404 });
    return NextResponse.json({ ok: true, changed: result.changed });
  } catch (error: unknown) {
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 503 },
      );
    throw error;
  }
}
