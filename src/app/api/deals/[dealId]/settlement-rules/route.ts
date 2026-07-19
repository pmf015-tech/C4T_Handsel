import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { findContractForParty } from "@/lib/db/contracts";
import { GeminiConfigurationError } from "@/lib/gemini/client";
import {
  AgentExtractionError,
  extractSettlementRules,
  SettlementRulesSchema,
} from "@/lib/gemini/settlement";

const ParamsSchema = z.object({ dealId: z.string().uuid() });

/**
 * E8 agent step 1: Gemini reads the current contract and proposes settlement
 * rules. The proposal is event-logged (AGENT_RULES_PROPOSED) and stored
 * unconfirmed; PATCH confirms it (human-confirmed once, spec E8).
 */
export async function POST(
  _request: Request,
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

  try {
    const sql = getDatabase();
    const contract = await findContractForParty(
      sql,
      params.data.dealId,
      userId,
    );
    if (!contract) return new NextResponse(null, { status: 404 });

    const { rules, model } = await extractSettlementRules(
      contract.version.content,
    );
    await sql.begin(async (transaction) => {
      await transaction`
        insert into settlement_rules (deal_id, rules, model)
        values (${params.data.dealId}, ${transaction.json(rules)}, ${model})
        on conflict (deal_id) do update set
          rules = excluded.rules, model = excluded.model,
          proposed_at = now(), confirmed_at = null,
          confirmed_by_clerk_user_id = null
      `;
      await transaction`
        insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
        values (
          ${randomUUID()}, ${params.data.dealId}, 'AGENT_RULES_PROPOSED',
          ${"agent:gemini-settlement"},
          ${transaction.json({ rules, model, triggeredBy: userId })}
        )
      `;
    });
    return NextResponse.json({ ok: true, rules, model });
  } catch (error: unknown) {
    if (error instanceof AgentExtractionError)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 502 },
      );
    if (
      error instanceof DatabaseConfigurationError ||
      error instanceof GeminiConfigurationError
    )
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 503 },
      );
    throw error;
  }
}

const ConfirmSchema = z.object({
  action: z.literal("confirm"),
  rules: SettlementRulesSchema,
});

/** E8: human confirms (possibly edited) agent-proposed rules. */
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
  const body = ConfirmSchema.safeParse(await request.json());
  if (!body.success)
    return NextResponse.json(
      { ok: false, message: "Provide the confirmed rules." },
      { status: 400 },
    );

  try {
    const sql = getDatabase();
    const partyRows = await sql`
      select role from deal_parties
      where deal_id = ${params.data.dealId} and clerk_user_id = ${userId}
      limit 1
    `;
    if (!partyRows[0]) return new NextResponse(null, { status: 404 });

    await sql.begin(async (transaction) => {
      await transaction`
        update settlement_rules set
          rules = ${transaction.json(body.data.rules)},
          confirmed_at = now(),
          confirmed_by_clerk_user_id = ${userId}
        where deal_id = ${params.data.dealId}
      `;
      await transaction`
        insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
        values (
          ${randomUUID()}, ${params.data.dealId}, 'AGENT_RULES_CONFIRMED',
          ${userId}, ${transaction.json({ rules: body.data.rules })}
        )
      `;
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 503 },
      );
    throw error;
  }
}
