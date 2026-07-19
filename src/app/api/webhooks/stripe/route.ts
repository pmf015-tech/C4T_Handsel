import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getDatabase } from "@/lib/db/client";
import { getStripe } from "@/lib/stripe/client";
import { syncConnectAccountStatus } from "@/lib/stripe/connect";
import { confirmFundedPayout } from "@/lib/stripe/payouts";

/**
 * Stripe webhook receiver — spec E4.
 * Signature-verified, idempotent via stripe_webhook_events primary key:
 * a replayed event id short-circuits before any state change, so losing or
 * replaying webhooks can never double-apply a money movement.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json(
      { ok: false, message: "STRIPE_WEBHOOK_SECRET is not set." },
      { status: 503 },
    );

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse(null, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const sql = getDatabase();
  const inserted = await sql`
    insert into stripe_webhook_events (stripe_event_id, event_type, payload)
    values (${event.id}, ${event.type}, ${sql.json(
      JSON.parse(JSON.stringify(event.data.object)),
    )})
    on conflict (stripe_event_id) do nothing
    returning stripe_event_id
  `;
  if (!inserted[0]) return NextResponse.json({ ok: true, replay: true });

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const payoutId = paymentIntent.metadata?.payout_id;
      if (payoutId) await confirmFundedPayout(sql, payoutId, paymentIntent.id);
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      await syncConnectAccountStatus(sql, account.id, account);
      break;
    }
    default:
      break;
  }
  return NextResponse.json({ ok: true });
}
