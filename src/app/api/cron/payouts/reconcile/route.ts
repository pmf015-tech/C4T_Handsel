import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db/client";
import { findStalePendingPayouts } from "@/lib/db/payouts";
import { getStripe } from "@/lib/stripe/client";
import { confirmFundedPayout } from "@/lib/stripe/payouts";

const STALE_MINUTES = 30;

/**
 * Reconciliation sweep — spec E4 acceptance criterion 2.
 * Repairs payouts whose webhook was lost: re-reads truth from Stripe and
 * applies the idempotent confirm path. Secret-gated like the E3 cron.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET is not set." },
      { status: 503 },
    );
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return new NextResponse(null, { status: 401 });

  const sql = getDatabase();
  const stale = await findStalePendingPayouts(sql, STALE_MINUTES);
  const repaired: string[] = [];

  for (const payout of stale) {
    if (payout.state !== "FUNDING_PENDING") continue;
    // The checkout webhook may have been lost before the PaymentIntent id was
    // recorded, so recover it from Stripe by metadata (WebhookLost repair).
    const search = await getStripe().paymentIntents.search({
      query: `metadata['payout_id']:'${payout.id}' AND status:'succeeded'`,
      limit: 1,
    });
    const paymentIntent = search.data[0];
    if (paymentIntent) {
      await confirmFundedPayout(sql, payout.id, paymentIntent.id);
      repaired.push(payout.id);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: stale.length,
    repaired,
  });
}
