import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { findSalesReportsForParty } from "@/lib/db/sales-reports";
import { GeminiConfigurationError } from "@/lib/gemini/client";
import {
  reconcileSalesReport,
  SettlementRulesSchema,
} from "@/lib/gemini/settlement";

const ParamsSchema = z.object({ dealId: z.string().uuid() });

/**
 * E8 agent step 2: reconcile the latest sales report against the confirmed
 * settlement rules. Payable amounts come from computeRevShare (deterministic);
 * Gemini contributes anomaly flags + the statement narrative. Event-logged as
 * AGENT_RECONCILED (agent execution log doubles as XPRIZE evidence).
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
    const reports = await findSalesReportsForParty(
      sql,
      params.data.dealId,
      userId,
    );
    const latest = reports[0];
    if (!latest)
      return NextResponse.json(
        { ok: false, message: "No sales report to reconcile yet." },
        { status: 409 },
      );

    const rulesRows = await sql`
      select rules, confirmed_at as "confirmedAt"
      from settlement_rules where deal_id = ${params.data.dealId}
    `;
    if (!rulesRows[0]?.confirmedAt)
      return NextResponse.json(
        { ok: false, message: "Confirm settlement rules before reconciling." },
        { status: 409 },
      );
    const rules = SettlementRulesSchema.parse(rulesRows[0].rules);

    const result = await reconcileSalesReport(rules, {
      periodEnd:
        latest.periodEnd instanceof Date
          ? latest.periodEnd.toISOString().slice(0, 10)
          : String(latest.periodEnd),
      units: latest.units,
      grossRevenueMinorUnits: latest.grossRevenueMinorUnits,
      timing: latest.timing,
    });

    await sql`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (
        ${randomUUID()}, ${params.data.dealId}, 'AGENT_RECONCILED',
        ${"agent:gemini-settlement"},
        ${sql.json({ ...result, flags: [...result.flags], triggeredBy: userId })}
      )
    `;
    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
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
